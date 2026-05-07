namespace PricingEngine.Models
{
    public class UpdateDiscountRequest
    {
        public string Code { get; set; }
        public DateTime ExpirationDate { get; set; }
        public decimal DiscountValue { get; set; }
        public bool Used { get; set; }
        public Guid BookingId { get; set; }
    }
}
