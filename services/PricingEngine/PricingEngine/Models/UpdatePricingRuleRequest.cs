namespace PricingEngine.Models
{
	public class UpdatePricingRuleRequest
	{
		public DateTime? DateInit { get; set; }
		public DateTime? DateFinish { get; set; }
		public int? MinGuests { get; set; }
		public int? MaxGuests { get; set; }
		public decimal Percentage { get; set; }
	}
}
