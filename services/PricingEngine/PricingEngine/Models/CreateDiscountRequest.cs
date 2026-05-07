namespace PricingEngine.Models
{
    public class CreateDiscountRequest
    {
        public string Code { get; set; }
        public DateTime ExpirationDate { get; set; }
        public decimal DiscountValue { get; set; }
        public Guid BookingId { get; set; }
    }
}
