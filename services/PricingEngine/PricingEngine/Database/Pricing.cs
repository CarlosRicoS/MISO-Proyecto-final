using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PricingEngine.Database
{
	[Table("pricing")]
	public class Pricing
	{
		[Key]
		[Column("id", TypeName = "uuid")]
		public Guid Id { get; set; } = Guid.NewGuid();

		[Required]
		[Column("base_price", TypeName = "decimal(18,2)")]
		public decimal BasePrice { get; set; }

		[Required]
		[Column("property_id", TypeName = "uuid")]
		public Guid PropertyId { get; set; }

		// Navigation property
		public ICollection<PricingRule> PricingRules { get; set; } = [];
	}
}
