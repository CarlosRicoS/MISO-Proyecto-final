namespace PricingEngine.Models
{
	public class PricingResponse
	{
		public Guid Id { get; set; }
		public decimal BasePrice { get; set; }
		public Guid PropertyId { get; set; }
	}
}
