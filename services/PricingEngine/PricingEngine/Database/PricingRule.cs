using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PricingEngine.Database
{
	[Table("pricing_rule")]
	public class PricingRule
	{
		[Key]
		[Column("id", TypeName = "uuid")]
		public Guid Id { get; set; } = Guid.NewGuid();

		[Required]
		[Column("price_id", TypeName = "uuid")]
		public Guid PriceId { get; set; }

		[Column("date_init", TypeName = "date")]
		public DateTime? DateInit { get; set; }

		[Column("date_finish", TypeName = "date")]
		public DateTime? DateFinish { get; set; }

		[Column("min_guests")]
		public int? MinGuests { get; set; }

		[Column("max_guests")]
		public int? MaxGuests { get; set; }

		[Required]
		[Column("percentage", TypeName = "decimal(5,2)")]
		public decimal Percentage { get; set; }

		// Navigation property
		[ForeignKey("PriceId")]
		public Pricing Pricing { get; set; }
	}
}
