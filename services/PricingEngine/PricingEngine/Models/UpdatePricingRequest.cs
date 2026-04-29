namespace PricingEngine.Models
{
	public class UpdatePricingRequest
	{
		public decimal BasePrice { get; set; }
		public Guid PropertyId { get; set; }
	}
}
