using PricingEngine.Models;

namespace PricingEngine.Database
{
	public interface IDatabaseOperations
	{
		Task<PropertyPriceResponse> CalculatePrice(PropertyPriceRequest request);

		// Pricing CRUD operations
		Task<PricingResponse> CreatePricing(CreatePricingRequest request);
		Task<PricingResponse> GetPricingById(Guid id);
		Task<List<PricingResponse>> GetAllPricings();
		Task<PricingResponse> UpdatePricing(Guid id, UpdatePricingRequest request);
		Task<bool> DeletePricing(Guid id);

		// PricingRule CRUD operations
		Task<PricingRuleResponse> CreatePricingRule(Guid pricingId, CreatePricingRuleRequest request);
		Task<PricingRuleResponse> GetPricingRuleById(Guid pricingId, Guid ruleId);
		Task<List<PricingRuleResponse>> GetPricingRulesByPricingId(Guid pricingId);
		Task<PricingRuleResponse> UpdatePricingRule(Guid pricingId, Guid ruleId, UpdatePricingRuleRequest request);
		Task<bool> DeletePricingRule(Guid pricingId, Guid ruleId);

		// Discount CRUD operations
		Task<DiscountResponse> CreateDiscount(CreateDiscountRequest request);
		Task<DiscountResponse> GetDiscountById(Guid id);
		Task<List<DiscountResponse>> GetAllDiscounts();
		Task<DiscountResponse> UpdateDiscount(Guid id, UpdateDiscountRequest request);
		Task<bool> DeleteDiscount(Guid id);
	}
}
