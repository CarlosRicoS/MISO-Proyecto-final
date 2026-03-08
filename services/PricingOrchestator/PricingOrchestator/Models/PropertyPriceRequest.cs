namespace PricingOrchestator.Models
{
	public class PropertyPriceRequest
	{
		public Guid PropertyId { get; set; }
		public int Guests { get; set; }
		public DateTime DateInit { get; set; }
		public DateTime DateFinish { get; set; }
		public string? DiscountCode { get; set; }
	}
}
