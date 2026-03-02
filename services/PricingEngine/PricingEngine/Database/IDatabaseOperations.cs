using PricingEngine.Models;

namespace PricingEngine.Database
{
	public interface IDatabaseOperations
	{
		Task<PropertyPriceResponse> CalculatePrice(PropertyPriceRequest request);
	}
}
