using FluentAssertions;
using PricingEngine.Database;
using PricingEngine.Models;
using PricingEngineTests.Fixtures;
using PricingEngineTests.Helpers;

namespace PricingEngineTests;

public class DiscountCrudTests
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
    public async Task CreateDiscount_Should_Create_Discount_Successfully()
    {
        var request = new CreateDiscountRequest
        {
            Code = "SPRING2026",
            ExpirationDate = DateTime.Now.AddDays(30),
            DiscountValue = 15.5m,
            BookingId = Guid.NewGuid()
        };

        var result = await _service.CreateDiscount(request);

        result.Should().NotBeNull();
        result.Id.Should().NotBeEmpty();
        result.Code.Should().Be(request.Code);
        result.DiscountValue.Should().Be(request.DiscountValue);

        var db = await _context.Discounts.FindAsync(result.Id);
        db.Should().NotBeNull();
        db.Code.Should().Be(request.Code);
    }

    [Test]
    public void CreateDiscount_Should_Throw_When_Code_IsEmpty()
    {
        var request = new CreateDiscountRequest
        {
            Code = "",
            ExpirationDate = DateTime.Now.AddDays(10),
            DiscountValue = 5m,
            BookingId = Guid.NewGuid()
        };

        var ex = Assert.ThrowsAsync<ArgumentException>(() => _service.CreateDiscount(request));
        ex.Message.Should().Contain("Code is required");
    }

    [Test]
    public void CreateDiscount_Should_Throw_When_DiscountValue_OutOfRange()
    {
        var request = new CreateDiscountRequest
        {
            Code = "X",
            ExpirationDate = DateTime.Now.AddDays(10),
            DiscountValue = 150m,
            BookingId = Guid.NewGuid()
        };

        var ex = Assert.ThrowsAsync<ArgumentException>(() => _service.CreateDiscount(request));
        ex.Message.Should().Contain("DiscountValue must be between 0 and 100");
    }

    [Test]
    public async Task GetDiscountById_Should_Return_When_Exists()
    {
        var discount = DiscountFaker.Generate("CODE1", 10m);
        _context.Discounts.Add(discount);
        await _context.SaveChangesAsync();

        var result = await _service.GetDiscountById(discount.Id);

        result.Should().NotBeNull();
        result.Id.Should().Be(discount.Id);
        result.Code.Should().Be("CODE1");
    }

    [Test]
    public void GetDiscountById_Should_Throw_When_NotFound()
    {
        var ex = Assert.ThrowsAsync<KeyNotFoundException>(() => _service.GetDiscountById(Guid.NewGuid()));
        ex.Message.Should().Contain("not found");
    }

    [Test]
    public async Task GetAllDiscounts_Should_Return_Empty_When_None()
    {
        var result = await _service.GetAllDiscounts();
        result.Should().BeEmpty();
    }

    [Test]
    public async Task GetAllDiscounts_Should_Return_AllDiscounts()
    {
        var d1 = DiscountFaker.Generate("A", 5m);
        var d2 = DiscountFaker.Generate("B", 10m);
        _context.Discounts.AddRange(d1, d2);
        await _context.SaveChangesAsync();

        var result = await _service.GetAllDiscounts();
        result.Should().HaveCount(2);
        result.Should().Contain(d => d.Id == d1.Id);
        result.Should().Contain(d => d.Id == d2.Id);
    }

    [Test]
    public async Task UpdateDiscount_Should_Update_Successfully()
    {
        var discount = DiscountFaker.Generate("OLD", 5m);
        _context.Discounts.Add(discount);
        await _context.SaveChangesAsync();

        var update = new UpdateDiscountRequest
        {
            Code = "NEW",
            ExpirationDate = DateTime.Now.AddDays(60),
            DiscountValue = 20m,
            Used = true,
            BookingId = discount.BookingId
        };

        var result = await _service.UpdateDiscount(discount.Id, update);

        result.Should().NotBeNull();
        result.Id.Should().Be(discount.Id);
        result.Code.Should().Be("NEW");
        result.DiscountValue.Should().Be(20m);

        var db = await _context.Discounts.FindAsync(discount.Id);
        db.Code.Should().Be("NEW");
        db.Used.Should().BeTrue();
    }

    [Test]
    public void UpdateDiscount_Should_Throw_When_NotFound()
    {
        var update = new UpdateDiscountRequest
        {
            Code = "X",
            ExpirationDate = DateTime.Now.AddDays(1),
            DiscountValue = 1m,
            Used = false,
            BookingId = Guid.NewGuid()
        };

        var ex = Assert.ThrowsAsync<KeyNotFoundException>(() => _service.UpdateDiscount(Guid.NewGuid(), update));
        ex.Message.Should().Contain("not found");
    }

    [Test]
    public void UpdateDiscount_Should_Throw_When_DiscountValue_OutOfRange()
    {
        var discount = DiscountFaker.Generate("Z", 5m);
        _context.Discounts.Add(discount);
        _context.SaveChangesAsync().Wait();

        var update = new UpdateDiscountRequest
        {
            Code = "Z",
            ExpirationDate = DateTime.Now.AddDays(1),
            DiscountValue = -10m,
            Used = false,
            BookingId = discount.BookingId
        };

        var ex = Assert.ThrowsAsync<ArgumentException>(() => _service.UpdateDiscount(discount.Id, update));
        ex.Message.Should().Contain("DiscountValue must be between 0 and 100");
    }

    [Test]
    public async Task DeleteDiscount_Should_Delete_Successfully()
    {
        var discount = DiscountFaker.Generate("DEL", 5m);
        _context.Discounts.Add(discount);
        await _context.SaveChangesAsync();

        var result = await _service.DeleteDiscount(discount.Id);
        result.Should().BeTrue();

        var db = await _context.Discounts.FindAsync(discount.Id);
        db.Should().BeNull();
    }

    [Test]
    public void DeleteDiscount_Should_Throw_When_NotFound()
    {
        var ex = Assert.ThrowsAsync<KeyNotFoundException>(() => _service.DeleteDiscount(Guid.NewGuid()));
        ex.Message.Should().Contain("not found");
    }
}
