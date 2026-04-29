namespace PricingEngine.Models
{
	public class PricingRuleResponse
	{
		public Guid Id { get; set; }
		public Guid PriceId { get; set; }
		public DateTime? DateInit { get; set; }
		public DateTime? DateFinish { get; set; }
		public int? MinGuests { get; set; }
		public int? MaxGuests { get; set; }
		public decimal Percentage { get; set; }
	}
}
