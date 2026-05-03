namespace PricingEngine.Models
{
	public class CreatePricingRequest
	{
		public decimal BasePrice { get; set; }
		public Guid PropertyId { get; set; }
	}
}
