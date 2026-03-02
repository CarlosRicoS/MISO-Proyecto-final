using Microsoft.EntityFrameworkCore;

namespace PricingEngine.Database
{
	public class DatabaseContext(DbContextOptions<DatabaseContext> options) : DbContext(options)
	{
		public DbSet<Pricing> Pricings { get; set; }
		public DbSet<PricingRule> PricingRules { get; set; }
		public DbSet<Discount> Discounts { get; set; }

		protected override void OnModelCreating(ModelBuilder modelBuilder)
		{
			modelBuilder.Entity<Pricing>()
				.HasMany(p => p.PricingRules)
				.WithOne(r => r.Pricing)
				.HasForeignKey(r => r.PriceId);
		}
	}
}
