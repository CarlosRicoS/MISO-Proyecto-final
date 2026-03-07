using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PricingEngine.Database
{
	[Table("discount")]
	public class Discount
	{
		[Key]
		[Column("id", TypeName = "uuid")]
		public Guid Id { get; set; } = Guid.NewGuid();

		[Required]
		[Column("code", TypeName = "varchar(50)")]
		public string Code { get; set; }

		[Required]
		[Column("creation_date", TypeName = "date")]
		public DateTime CreationDate { get; set; } = DateTime.Now;

		[Required]
		[Column("expiration_date", TypeName = "date")]
		public DateTime ExpirationDate { get; set; }

		[Required]
		[Column("discount_value", TypeName = "decimal(18,2)")]
		public decimal DiscountValue { get; set; }

		[Required]
		[Column("used", TypeName = "boolean")]
		public bool Used { get; set; }

		[Required]
		[Column("booking_id", TypeName = "uuid")]
		public Guid BookingId { get; set; }
	}
}
