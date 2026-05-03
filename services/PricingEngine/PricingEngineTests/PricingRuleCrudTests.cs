using FluentAssertions;
using PricingEngine.Database;
using PricingEngine.Models;
using PricingEngineTests.Fixtures;
using PricingEngineTests.Helpers;

namespace PricingEngineTests;

public class PricingRuleCrudTests
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

	#region CreatePricingRule Tests

	[Test]
	public async Task CreatePricingRule_Should_Create_Rule_Successfully()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		_context.Pricings.Add(pricing);
		await _context.SaveChangesAsync();

		var request = new CreatePricingRuleRequest
		{
			DateInit = DateTime.Today,
			DateFinish = DateTime.Today.AddDays(10),
			MinGuests = 2,
			MaxGuests = 4,
			Percentage = 15.50m
		};

		// Act
		var result = await _service.CreatePricingRule(pricing.Id, request);

		// Assert
		result.Should().NotBeNull();
		result.Id.Should().NotBeEmpty();
		result.PriceId.Should().Be(pricing.Id);
		result.DateInit.Should().Be(DateTime.Today);
		result.DateFinish.Should().Be(DateTime.Today.AddDays(10));
		result.MinGuests.Should().Be(2);
		result.MaxGuests.Should().Be(4);
		result.Percentage.Should().Be(15.50m);

		// Verify in database
		var dbRule = await _context.PricingRules.FindAsync(result.Id);
		dbRule.Should().NotBeNull();
		dbRule.PriceId.Should().Be(pricing.Id);
	}

	[Test]
	public async Task CreatePricingRule_Should_Create_Rule_With_Nullable_Fields()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		_context.Pricings.Add(pricing);
		await _context.SaveChangesAsync();

		var request = new CreatePricingRuleRequest
		{
			DateInit = null,
			DateFinish = null,
			MinGuests = null,
			MaxGuests = null,
			Percentage = 20.00m
		};

		// Act
		var result = await _service.CreatePricingRule(pricing.Id, request);

		// Assert
		result.DateInit.Should().BeNull();
		result.DateFinish.Should().BeNull();
		result.MinGuests.Should().BeNull();
		result.MaxGuests.Should().BeNull();
		result.Percentage.Should().Be(20.00m);
	}

	[Test]
	public void CreatePricingRule_Should_Throw_When_Pricing_NotFound()
	{
		// Arrange
		var nonExistentPricingId = Guid.NewGuid();
		var request = new CreatePricingRuleRequest
		{
			Percentage = 15.00m
		};

		// Act & Assert
		var exception = Assert.ThrowsAsync<KeyNotFoundException>(
			() => _service.CreatePricingRule(nonExistentPricingId, request));
		exception.Message.Should().Contain("not found");
	}

	[Test]
	public void CreatePricingRule_Should_Throw_When_Percentage_IsNegative()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		_context.Pricings.Add(pricing);
		_context.SaveChangesAsync().Wait();

		var request = new CreatePricingRuleRequest
		{
			Percentage = -10.00m
		};

		// Act & Assert
		var exception = Assert.ThrowsAsync<ArgumentException>(
			() => _service.CreatePricingRule(pricing.Id, request));
		exception.Message.Should().Contain("Percentage must be between 0 and 100");
	}

	[Test]
	public void CreatePricingRule_Should_Throw_When_Percentage_ExceedsHundred()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		_context.Pricings.Add(pricing);
		_context.SaveChangesAsync().Wait();

		var request = new CreatePricingRuleRequest
		{
			Percentage = 150.00m
		};

		// Act & Assert
		var exception = Assert.ThrowsAsync<ArgumentException>(
			() => _service.CreatePricingRule(pricing.Id, request));
		exception.Message.Should().Contain("Percentage must be between 0 and 100");
	}

	[Test]
	public async Task CreatePricingRule_Should_Accept_ZeroPercentage()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		_context.Pricings.Add(pricing);
		await _context.SaveChangesAsync();

		var request = new CreatePricingRuleRequest
		{
			Percentage = 0
		};

		// Act
		var result = await _service.CreatePricingRule(pricing.Id, request);

		// Assert
		result.Percentage.Should().Be(0);
	}

	[Test]
	public async Task CreatePricingRule_Should_Accept_HundredPercentage()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		_context.Pricings.Add(pricing);
		await _context.SaveChangesAsync();

		var request = new CreatePricingRuleRequest
		{
			Percentage = 100
		};

		// Act
		var result = await _service.CreatePricingRule(pricing.Id, request);

		// Assert
		result.Percentage.Should().Be(100);
	}

	#endregion

	#region GetPricingRuleById Tests

	[Test]
	public async Task GetPricingRuleById_Should_Return_Rule_When_Exists()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		var rule = PricingRuleFaker.Generate(pricing.Id, DateTime.Today, DateTime.Today.AddDays(10), 20);

		_context.Pricings.Add(pricing);
		_context.PricingRules.Add(rule);
		await _context.SaveChangesAsync();

		// Act
		var result = await _service.GetPricingRuleById(pricing.Id, rule.Id);

		// Assert
		result.Should().NotBeNull();
		result.Id.Should().Be(rule.Id);
		result.PriceId.Should().Be(pricing.Id);
		result.Percentage.Should().Be(20);
	}

	[Test]
	public void GetPricingRuleById_Should_Throw_When_Rule_NotFound()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricingId = Guid.NewGuid();
		var nonExistentRuleId = Guid.NewGuid();

		// Act & Assert
		var exception = Assert.ThrowsAsync<KeyNotFoundException>(
			() => _service.GetPricingRuleById(pricingId, nonExistentRuleId));
		exception.Message.Should().Contain("not found");
	}

	[Test]
	public void GetPricingRuleById_Should_Throw_When_Rule_BelongsToDifferentPricing()
	{
		// Arrange
		var propertyId1 = Guid.NewGuid();
		var propertyId2 = Guid.NewGuid();
		var pricing1 = PricingFaker.Generate(propertyId1, 100.00m);
		var pricing2 = PricingFaker.Generate(propertyId2, 100.00m);
		var rule = PricingRuleFaker.Generate(pricing1.Id, DateTime.Today, DateTime.Today.AddDays(10), 20);

		_context.Pricings.AddRange(pricing1, pricing2);
		_context.PricingRules.Add(rule);
		_context.SaveChangesAsync().Wait();

		// Act & Assert
		var exception = Assert.ThrowsAsync<KeyNotFoundException>(
			() => _service.GetPricingRuleById(pricing2.Id, rule.Id));
		exception.Message.Should().Contain("not found");
	}

	#endregion

	#region GetPricingRulesByPricingId Tests

	[Test]
	public async Task GetPricingRulesByPricingId_Should_Return_Empty_When_NoRules()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		_context.Pricings.Add(pricing);
		await _context.SaveChangesAsync();

		// Act
		var result = await _service.GetPricingRulesByPricingId(pricing.Id);

		// Assert
		result.Should().BeEmpty();
	}

	[Test]
	public async Task GetPricingRulesByPricingId_Should_Return_AllRules()
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
		var result = await _service.GetPricingRulesByPricingId(pricing.Id);

		// Assert
		result.Should().HaveCount(2);
		result.Should().Contain(r => r.Id == rule1.Id);
		result.Should().Contain(r => r.Id == rule2.Id);
	}

	[Test]
	public void GetPricingRulesByPricingId_Should_Throw_When_Pricing_NotFound()
	{
		// Arrange
		var nonExistentPricingId = Guid.NewGuid();

		// Act & Assert
		var exception = Assert.ThrowsAsync<KeyNotFoundException>(
			() => _service.GetPricingRulesByPricingId(nonExistentPricingId));
		exception.Message.Should().Contain("not found");
	}

	[Test]
	public async Task GetPricingRulesByPricingId_Should_Return_Only_Rules_ForSpecificPricing()
	{
		// Arrange
		var propertyId1 = Guid.NewGuid();
		var propertyId2 = Guid.NewGuid();
		var pricing1 = PricingFaker.Generate(propertyId1, 100.00m);
		var pricing2 = PricingFaker.Generate(propertyId2, 100.00m);
		var rule1 = PricingRuleFaker.Generate(pricing1.Id, DateTime.Today, DateTime.Today.AddDays(5), 10);
		var rule2 = PricingRuleFaker.Generate(pricing1.Id, DateTime.Today.AddDays(5), DateTime.Today.AddDays(10), 20);
		var rule3 = PricingRuleFaker.Generate(pricing2.Id, DateTime.Today, DateTime.Today.AddDays(5), 15);

		_context.Pricings.AddRange(pricing1, pricing2);
		_context.PricingRules.AddRange(rule1, rule2, rule3);
		await _context.SaveChangesAsync();

		// Act
		var result = await _service.GetPricingRulesByPricingId(pricing1.Id);

		// Assert
		result.Should().HaveCount(2);
		result.Should().Contain(r => r.Id == rule1.Id);
		result.Should().Contain(r => r.Id == rule2.Id);
		result.Should().NotContain(r => r.Id == rule3.Id);
	}

	#endregion

	#region UpdatePricingRule Tests

	[Test]
	public async Task UpdatePricingRule_Should_Update_Rule_Successfully()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		var rule = PricingRuleFaker.Generate(pricing.Id, DateTime.Today, DateTime.Today.AddDays(10), 20);

		_context.Pricings.Add(pricing);
		_context.PricingRules.Add(rule);
		await _context.SaveChangesAsync();

		var updateRequest = new UpdatePricingRuleRequest
		{
			DateInit = DateTime.Today.AddDays(1),
			DateFinish = DateTime.Today.AddDays(15),
			MinGuests = 1,
			MaxGuests = 6,
			Percentage = 30.50m
		};

		// Act
		var result = await _service.UpdatePricingRule(pricing.Id, rule.Id, updateRequest);

		// Assert
		result.Should().NotBeNull();
		result.Id.Should().Be(rule.Id);
		result.PriceId.Should().Be(pricing.Id);
		result.DateInit.Should().Be(DateTime.Today.AddDays(1));
		result.DateFinish.Should().Be(DateTime.Today.AddDays(15));
		result.MinGuests.Should().Be(1);
		result.MaxGuests.Should().Be(6);
		result.Percentage.Should().Be(30.50m);

		// Verify in database
		var dbRule = await _context.PricingRules.FindAsync(rule.Id);
		dbRule.Percentage.Should().Be(30.50m);
	}

	[Test]
	public void UpdatePricingRule_Should_Throw_When_Rule_NotFound()
	{
		// Arrange
		var pricingId = Guid.NewGuid();
		var nonExistentRuleId = Guid.NewGuid();
		var updateRequest = new UpdatePricingRuleRequest
		{
			Percentage = 25.00m
		};

		// Act & Assert
		var exception = Assert.ThrowsAsync<KeyNotFoundException>(
			() => _service.UpdatePricingRule(pricingId, nonExistentRuleId, updateRequest));
		exception.Message.Should().Contain("not found");
	}

	[Test]
	public void UpdatePricingRule_Should_Throw_When_Percentage_IsInvalid()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		var rule = PricingRuleFaker.Generate(pricing.Id, DateTime.Today, DateTime.Today.AddDays(10), 20);

		_context.Pricings.Add(pricing);
		_context.PricingRules.Add(rule);
		_context.SaveChangesAsync().Wait();

		var updateRequest = new UpdatePricingRuleRequest
		{
			Percentage = 150.00m
		};

		// Act & Assert
		var exception = Assert.ThrowsAsync<ArgumentException>(
			() => _service.UpdatePricingRule(pricing.Id, rule.Id, updateRequest));
		exception.Message.Should().Contain("Percentage must be between 0 and 100");
	}

	[Test]
	public async Task UpdatePricingRule_Should_Update_To_Nullable_Fields()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		var rule = PricingRuleFaker.Generate(pricing.Id, DateTime.Today, DateTime.Today.AddDays(10), 20, 2, 4);

		_context.Pricings.Add(pricing);
		_context.PricingRules.Add(rule);
		await _context.SaveChangesAsync();

		var updateRequest = new UpdatePricingRuleRequest
		{
			DateInit = null,
			DateFinish = null,
			MinGuests = null,
			MaxGuests = null,
			Percentage = 25.00m
		};

		// Act
		var result = await _service.UpdatePricingRule(pricing.Id, rule.Id, updateRequest);

		// Assert
		result.DateInit.Should().BeNull();
		result.DateFinish.Should().BeNull();
		result.MinGuests.Should().BeNull();
		result.MaxGuests.Should().BeNull();
	}

	#endregion

	#region DeletePricingRule Tests

	[Test]
	public async Task DeletePricingRule_Should_Delete_Rule_Successfully()
	{
		// Arrange
		var propertyId = Guid.NewGuid();
		var pricing = PricingFaker.Generate(propertyId, 100.00m);
		var rule = PricingRuleFaker.Generate(pricing.Id, DateTime.Today, DateTime.Today.AddDays(10), 20);

		_context.Pricings.Add(pricing);
		_context.PricingRules.Add(rule);
		await _context.SaveChangesAsync();

		// Act
		var result = await _service.DeletePricingRule(pricing.Id, rule.Id);

		// Assert
		result.Should().BeTrue();

		// Verify it's deleted from database
		var dbRule = await _context.PricingRules.FindAsync(rule.Id);
		dbRule.Should().BeNull();
	}

	[Test]
	public void DeletePricingRule_Should_Throw_When_Rule_NotFound()
	{
		// Arrange
		var pricingId = Guid.NewGuid();
		var nonExistentRuleId = Guid.NewGuid();

		// Act & Assert
		var exception = Assert.ThrowsAsync<KeyNotFoundException>(
			() => _service.DeletePricingRule(pricingId, nonExistentRuleId));
		exception.Message.Should().Contain("not found");
	}

	[Test]
	public async Task DeletePricingRule_Should_Not_Delete_Other_Rules()
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
		await _service.DeletePricingRule(pricing.Id, rule1.Id);

		// Assert
		var dbRule1 = await _context.PricingRules.FindAsync(rule1.Id);
		var dbRule2 = await _context.PricingRules.FindAsync(rule2.Id);

		dbRule1.Should().BeNull();
		dbRule2.Should().NotBeNull();
	}

	#endregion
}
