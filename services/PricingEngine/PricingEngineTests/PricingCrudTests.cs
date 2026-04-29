using FluentAssertions;
using PricingEngine.Database;
using PricingEngine.Models;
using PricingEngineTests.Fixtures;
using PricingEngineTests.Helpers;

namespace PricingEngineTests;

public class PricingCrudTests
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

	#region CreatePricing Tests

	[Test]
	public async Task CreatePricing_Should_Create_Pricing_Successfully()
	{
		// Arrange
		var request = new CreatePricingRequest
		{
			BasePrice = 100.00m,
			PropertyId = Guid.NewGuid()
		};

		// Act
		var result = await _service.CreatePricing(request);

		// Assert
		result.Should().NotBeNull();
		result.Id.Should().NotBeEmpty();
		result.BasePrice.Should().Be(100.00m);
		result.PropertyId.Should().Be(request.PropertyId);

		// Verify it's in database
		var dbPricing = await _context.Pricings.FindAsync(result.Id);
		dbPricing.Should().NotBeNull();
		dbPricing.BasePrice.Should().Be(100.00m);
	}

	[Test]
	public void CreatePricing_Should_Throw_When_BasePrice_IsZero()
	{
		// Arrange
		var request = new CreatePricingRequest
		{
			BasePrice = 0,
			PropertyId = Guid.NewGuid()
		};

		// Act & Assert
		var exception = Assert.ThrowsAsync<ArgumentException>(
			() => _service.CreatePricing(request));
		exception.Message.Should().Contain("BasePrice must be greater than 0");
	}

	[Test]
	public void CreatePricing_Should_Throw_When_BasePrice_IsNegative()
	{
		// Arrange
		var request = new CreatePricingRequest
		{
			BasePrice = -50.00m,
			PropertyId = Guid.NewGuid()
		};

		// Act & Assert
		var exception = Assert.ThrowsAsync<ArgumentException>(
			() => _service.CreatePricing(request));
		exception.Message.Should().Contain("BasePrice must be greater than 0");
	}

	#endregion

	#region GetPricingById Tests

	[Test]
	public async Task GetPricingById_Should_Return_Pricing_When_Exists()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 150.00m);
		_context.Pricings.Add(pricing);
		await _context.SaveChangesAsync();

		// Act
		var result = await _service.GetPricingById(pricing.Id);

		// Assert
		result.Should().NotBeNull();
		result.Id.Should().Be(pricing.Id);
		result.BasePrice.Should().Be(150.00m);
		result.PropertyId.Should().Be(propertyId);
	}

	[Test]
	public void GetPricingById_Should_Throw_When_Pricing_NotFound()
	{
		// Arrange
		var nonExistentId = Guid.NewGuid();

		// Act & Assert
		var exception = Assert.ThrowsAsync<KeyNotFoundException>(
			() => _service.GetPricingById(nonExistentId));
		exception.Message.Should().Contain("not found");
	}

	#endregion

	#region GetAllPricings Tests

	[Test]
	public async Task GetAllPricings_Should_Return_Empty_When_NoPricings()
	{
		// Act
		var result = await _service.GetAllPricings();

		// Assert
		result.Should().BeEmpty();
	}

	[Test]
	public async Task GetAllPricings_Should_Return_AllPricings()
	{
		// Arrange
		var propertyId1 = Guid.NewGuid();
		var propertyId2 = Guid.NewGuid();

		var pricing1 = PricingFaker.Generate(propertyId1, 100.00m);
		var pricing2 = PricingFaker.Generate(propertyId2, 200.00m);

		_context.Pricings.AddRange(pricing1, pricing2);
		await _context.SaveChangesAsync();

		// Act
		var result = await _service.GetAllPricings();

		// Assert
		result.Should().HaveCount(2);
		result.Should().Contain(p => p.Id == pricing1.Id);
		result.Should().Contain(p => p.Id == pricing2.Id);
	}

	#endregion

	#region UpdatePricing Tests

	[Test]
	public async Task UpdatePricing_Should_Update_Pricing_Successfully()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		_context.Pricings.Add(pricing);
		await _context.SaveChangesAsync();

		var newPropertyId = Guid.NewGuid();
		var updateRequest = new UpdatePricingRequest
		{
			BasePrice = 250.00m,
			PropertyId = newPropertyId
		};

		// Act
		var result = await _service.UpdatePricing(pricing.Id, updateRequest);

		// Assert
		result.Should().NotBeNull();
		result.Id.Should().Be(pricing.Id);
		result.BasePrice.Should().Be(250.00m);
		result.PropertyId.Should().Be(newPropertyId);

		// Verify in database
		var dbPricing = await _context.Pricings.FindAsync(pricing.Id);
		dbPricing.BasePrice.Should().Be(250.00m);
		dbPricing.PropertyId.Should().Be(newPropertyId);
	}

	[Test]
	public void UpdatePricing_Should_Throw_When_Pricing_NotFound()
	{
		// Arrange
		var nonExistentId = Guid.NewGuid();
		var updateRequest = new UpdatePricingRequest
		{
			BasePrice = 150.00m,
			PropertyId = Guid.NewGuid()
		};

		// Act & Assert
		var exception = Assert.ThrowsAsync<KeyNotFoundException>(
			() => _service.UpdatePricing(nonExistentId, updateRequest));
		exception.Message.Should().Contain("not found");
	}

	[Test]
	public void UpdatePricing_Should_Throw_When_BasePrice_IsNegative()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		_context.Pricings.Add(pricing);
		_context.SaveChangesAsync().Wait();

		var updateRequest = new UpdatePricingRequest
		{
			BasePrice = -50.00m,
			PropertyId = propertyId
		};

		// Act & Assert
		var exception = Assert.ThrowsAsync<ArgumentException>(
			() => _service.UpdatePricing(pricing.Id, updateRequest));
		exception.Message.Should().Contain("BasePrice must be greater than 0");
	}

	#endregion

	#region DeletePricing Tests

	[Test]
	public async Task DeletePricing_Should_Delete_Pricing_Successfully()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		_context.Pricings.Add(pricing);
		await _context.SaveChangesAsync();

		// Act
		var result = await _service.DeletePricing(pricing.Id);

		// Assert
		result.Should().BeTrue();

		// Verify it's deleted from database
		var dbPricing = await _context.Pricings.FindAsync(pricing.Id);
		dbPricing.Should().BeNull();
	}

	[Test]
	public async Task DeletePricing_Should_Delete_Associated_PricingRules()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		var rule1 = PricingRuleFaker.Generate(pricing.Id, DateTime.Today, DateTime.Today.AddDays(5), 10);
		var rule2 = PricingRuleFaker.Generate(pricing.Id, DateTime.Today.AddDays(5), DateTime.Today.AddDays(10), 20);

		_context.Pricings.Add(pricing);
		_context.PricingRules.AddRange(rule1, rule2);
		await _context.SaveChangesAsync();

		// Act
		var result = await _service.DeletePricing(pricing.Id);

		// Assert
		result.Should().BeTrue();
		var remainingRules = _context.PricingRules.Where(r => r.PriceId == pricing.Id).ToList();
		remainingRules.Should().BeEmpty();
	}

	[Test]
	public void DeletePricing_Should_Throw_When_Pricing_NotFound()
	{
		// Arrange
		var nonExistentId = Guid.NewGuid();

		// Act & Assert
		var exception = Assert.ThrowsAsync<KeyNotFoundException>(
			() => _service.DeletePricing(nonExistentId));
		exception.Message.Should().Contain("not found");
	}

	#endregion
}
