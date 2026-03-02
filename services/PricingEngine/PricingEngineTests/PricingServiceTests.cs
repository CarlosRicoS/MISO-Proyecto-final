using FluentAssertions;
using PricingEngine.Database;
using PricingEngine.Models;
using PricingEngineTests.Fixtures;
using PricingEngineTests.Helpers;

namespace PricingEngineTests;

public class PricingServiceTests
{
	private DatabaseContext _context;
	private DatabaseOperations _service;

	[SetUp]
	public void Setup()
	{
		_context = TestDbContextFactory.Create();
		_service = new DatabaseOperations(_context);
	}

	[TearDown]
	public void Cleanup()
	{
		_context.Dispose();
	}

	[Test]
	public async Task Should_Return_BasePrice_When_NoRules()
	{
		var propertyId = Guid.NewGuid();

		var pricing = PricingFaker.Generate(propertyId, 100);

		_context.Pricings.Add(pricing);
		await _context.SaveChangesAsync();

		var result = await _service.CalculatePrice(
			new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = DateTime.Today,
				DateFinish = DateTime.Today.AddDays(3),
				DiscountCode = null
			});

		result.Price.Should().Be(300);
	}

	[Test]
	public async Task Should_Apply_Positive_Rule()
	{
		var propertyId = Guid.NewGuid();

		var pricing = PricingFaker.Generate(propertyId, 100);

		_context.Pricings.Add(pricing);

		var rule = PricingRuleFaker.Generate(
			pricing.Id,
			DateTime.Today,
			DateTime.Today.AddDays(5),
			10);

		_context.PricingRules.Add(rule);

		await _context.SaveChangesAsync();

		var result = await _service.CalculatePrice(
			new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = DateTime.Today,
				DateFinish = DateTime.Today.AddDays(2),
				DiscountCode = null
			});

		result.Price.Should().Be(220);
	}

	[Test]
	public async Task Should_Apply_Negative_Rule()
	{
		var propertyId = Guid.NewGuid();

		var pricing = PricingFaker.Generate(propertyId, 100);

		_context.Pricings.Add(pricing);

		var rule = PricingRuleFaker.Generate(
			pricing.Id,
			DateTime.Today,
			DateTime.Today.AddDays(5),
			-20);

		_context.PricingRules.Add(rule);

		await _context.SaveChangesAsync();

		var result = await _service.CalculatePrice(
			new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = DateTime.Today,
				DateFinish = DateTime.Today.AddDays(2),
				DiscountCode = null
			});

		result.Price.Should().Be(160);
	}

	[Test]
	public async Task Should_Apply_Multiple_Rules_Per_Night()
	{
		var propertyId = Guid.NewGuid();
		var today = DateTime.Today;

		var pricing = PricingFaker.Generate(propertyId, 100);

		_context.Pricings.Add(pricing);

		_context.PricingRules.AddRange(

			PricingRuleFaker.Generate(
				pricing.Id,
				today,
				today.AddDays(2),
				10),

			PricingRuleFaker.Generate(
				pricing.Id,
				today.AddDays(2),
				today.AddDays(4),
				20)
		);

		await _context.SaveChangesAsync();

		var result = await _service.CalculatePrice(
			new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = today,
				DateFinish = today.AddDays(4),
				DiscountCode = null
			});

		result.Price.Should().Be(460);
	}

	[Test]
	public async Task Should_Apply_Discount()
	{
		var propertyId = Guid.NewGuid();

		var pricing = PricingFaker.Generate(propertyId, 100);

		_context.Pricings.Add(pricing);

		var discount = DiscountFaker.Generate("TEST10", 10);

		_context.Discounts.Add(discount);

		await _context.SaveChangesAsync();

		var result = await _service.CalculatePrice(
			new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = DateTime.Today,
				DateFinish = DateTime.Today.AddDays(2),
				DiscountCode = "TEST10"
			});

		result.Price.Should().Be(180);
	}

	[Test]
	public async Task Should_Not_Apply_Expired_Discount()
	{
		var propertyId = Guid.NewGuid();

		var pricing = PricingFaker.Generate(propertyId, 100);

		_context.Pricings.Add(pricing);

		var discount = DiscountFaker.Generate(
			"OLD",
			50,
			false,
			DateTime.Now.AddDays(-1));

		_context.Discounts.Add(discount);

		await _context.SaveChangesAsync();

		var result = await _service.CalculatePrice(
			new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = DateTime.Today,
				DateFinish = DateTime.Today.AddDays(2),
				DiscountCode = "OLD"
			});

		result.Price.Should().Be(200);
	}

	[Test]
	public async Task Should_Not_Apply_Rule_When_Guests_OutOfRange()
	{
		var propertyId = Guid.NewGuid();

		var pricing = PricingFaker.Generate(propertyId, 100);

		_context.Pricings.Add(pricing);

		var rule = PricingRuleFaker.Generate(
			pricing.Id,
			DateTime.Today,
			DateTime.Today.AddDays(5),
			50,
			5,
			10);

		_context.PricingRules.Add(rule);

		await _context.SaveChangesAsync();

		var result = await _service.CalculatePrice(
			new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = DateTime.Today,
				DateFinish = DateTime.Today.AddDays(2),
				DiscountCode = null
			});

		result.Price.Should().Be(200);
	}

	[Test]
	public void Should_Throw_When_Pricing_NotFound()
	{
		var propertyId = Guid.NewGuid();

		Func<Task> act = async () =>
			await _service.CalculatePrice(
				new PropertyPriceRequest
				{
					PropertyId = propertyId,
					Guests = 2,
					DateInit = DateTime.Today,
					DateFinish = DateTime.Today.AddDays(2),
					DiscountCode = null
				});

		act.Should().ThrowAsync<Exception>();
	}

	[Test]
	public async Task Should_Apply_Overlapping_Rules_On_Same_Night()
	{
		var propertyId = Guid.NewGuid();
		var today = DateTime.Today;

		var pricing = PricingFaker.Generate(propertyId, 100);
		_context.Pricings.Add(pricing);

		_context.PricingRules.AddRange(
			PricingRuleFaker.Generate(pricing.Id, today, today.AddDays(2), 10),
			PricingRuleFaker.Generate(pricing.Id, today, today.AddDays(3), 5)
		);

		await _context.SaveChangesAsync();

		var result = await _service.CalculatePrice(
			new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = today,
				DateFinish = today.AddDays(2),
				DiscountCode = null
			});

		result.Price.Should().Be(230);
	}

	[Test]
	public async Task Should_Apply_Rule_And_Discount_Together()
	{
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100);

		_context.Pricings.Add(pricing);

		var rule = PricingRuleFaker.Generate(
			pricing.Id,
			DateTime.Today,
			DateTime.Today.AddDays(5),
			20);

		_context.PricingRules.Add(rule);

		var discount = DiscountFaker.Generate("SUPER", 15);
		_context.Discounts.Add(discount);

		await _context.SaveChangesAsync();

		var result = await _service.CalculatePrice(
			new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = DateTime.Today,
				DateFinish = DateTime.Today.AddDays(2),
				DiscountCode = "SUPER"
			});

		result.Price.Should().Be(204);
	}

	[Test]
	public async Task Should_Not_Apply_Rule_When_Reservation_Before_Rule_Starts()
	{
		var propertyId = Guid.NewGuid();
		var today = DateTime.Today;

		var pricing = PricingFaker.Generate(propertyId, 100);
		_context.Pricings.Add(pricing);

		var rule = PricingRuleFaker.Generate(
			pricing.Id,
			today.AddDays(5),
			today.AddDays(10),
			50);

		_context.PricingRules.Add(rule);
		await _context.SaveChangesAsync();

		var result = await _service.CalculatePrice(
			new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = today,
				DateFinish = today.AddDays(2),
				DiscountCode = null
			});

		result.Price.Should().Be(200);
	}

	[Test]
	public async Task Should_Apply_Partial_Rule_When_Reservation_Overlaps()
	{
		var propertyId = Guid.NewGuid();
		var today = DateTime.Today;

		var pricing = PricingFaker.Generate(propertyId, 100);
		_context.Pricings.Add(pricing);

		var rule = PricingRuleFaker.Generate(
			pricing.Id,
			today.AddDays(1),
			today.AddDays(3),
			30);

		_context.PricingRules.Add(rule);
		await _context.SaveChangesAsync();

		var result = await _service.CalculatePrice(
			new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = today,
				DateFinish = today.AddDays(4),
				DiscountCode = null
			});

		result.Price.Should().Be(460);
	}

	[Test]
	public void Should_Throw_When_DateFinish_Equals_DateInit()
	{
		var propertyId = Guid.NewGuid();
		var today = DateTime.Today;

		Func<Task> act = async () =>
			await _service.CalculatePrice(
				new PropertyPriceRequest
				{
					PropertyId = propertyId,
					Guests = 2,
					DateInit = today,
					DateFinish = today,
					DiscountCode = null
				});

		act.Should().ThrowAsync<ArgumentException>()
			.WithMessage("Invalid date range");
	}

	[Test]
	public void Should_Throw_When_Guests_Is_Zero()
	{
		var propertyId = Guid.NewGuid();

		Func<Task> act = async () =>
			await _service.CalculatePrice(
				new PropertyPriceRequest
				{
					PropertyId = propertyId,
					Guests = 0,
					DateInit = DateTime.Today,
					DateFinish = DateTime.Today.AddDays(2),
					DiscountCode = null
				});

		act.Should().ThrowAsync<ArgumentException>()
			.WithMessage("Guests must be greater than 0");
	}

	[Test]
	public async Task Should_Handle_Rule_With_Null_MinGuests()
	{
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100);

		_context.Pricings.Add(pricing);

		var rule = PricingRuleFaker.Generate(
			pricing.Id,
			DateTime.Today,
			DateTime.Today.AddDays(5),
			25,
			minGuests: 0,
			maxGuests: 100);

		_context.PricingRules.Add(rule);
		await _context.SaveChangesAsync();

		var result = await _service.CalculatePrice(
			new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 1,
				DateInit = DateTime.Today,
				DateFinish = DateTime.Today.AddDays(2),
				DiscountCode = null
			});

		result.Price.Should().Be(250);
	}

	[Test]
	public async Task Should_Not_Apply_Used_Discount()
	{
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100);

		_context.Pricings.Add(pricing);

		var discount = DiscountFaker.Generate("USED", 50, used: true);
		_context.Discounts.Add(discount);

		await _context.SaveChangesAsync();

		var result = await _service.CalculatePrice(
			new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = DateTime.Today,
				DateFinish = DateTime.Today.AddDays(2),
				DiscountCode = "USED"
			});

		result.Price.Should().Be(200);
	}
}
