using Microsoft.EntityFrameworkCore;
using PricingEngine.Models;

namespace PricingEngine.Database
{
	public class DatabaseOperations(DatabaseContext context) : IDatabaseOperations
	{
		public async Task<PropertyPriceResponse> CalculatePrice(PropertyPriceRequest r)
		{

			if (r.DateFinish <= r.DateInit)
				throw new ArgumentException("Invalid date range");

			if (r.Guests <= 0)
				throw new ArgumentException("Guests must be greater than 0");

			var nights = (r.DateFinish.Date - r.DateInit.Date).Days;

			// STEP 1: Obtener pricing
			var pricing = await context.Pricings
				.Where(p => p.PropertyId == r.PropertyId)
				.Select(p => new
				{
					p.Id,
					p.BasePrice
				})
				.FirstOrDefaultAsync() ?? throw new Exception("Pricing not found");
			var basePrice = pricing.BasePrice;

			// STEP 2: traer SOLO reglas que intersectan el rango completo
			var rules = await context.PricingRules
				.Where(p => p.PriceId == pricing.Id)
				.Where(p =>
					// intersecta fechas (DateFinish es exclusivo)
					(p.DateInit < r.DateFinish && p.DateFinish > r.DateInit)
					&&
					// cumple guests (nullable = sin límite)
					((p.MinGuests == null || p.MinGuests <= r.Guests) && 
					 (p.MaxGuests == null || p.MaxGuests >= r.Guests))
				)
				.Select(p => new
				{
					p.DateInit,
					p.DateFinish,
					p.Percentage
				})
				.ToListAsync();

			// STEP 3: discount
			decimal discountPercentage = 0;

			if (!string.IsNullOrWhiteSpace(r.DiscountCode))
			{
				discountPercentage = await context.Discounts
					.Where(d =>
						d.Code == r.DiscountCode &&
						!d.Used &&
						d.ExpirationDate >= DateTime.Now.Date)
					.Select(d => d.DiscountValue)
					.FirstOrDefaultAsync();
			}

			// STEP 4: calcular precio por noche
			decimal total = 0;

			for (int i = 0; i < nights; i++)
			{
				var currentDate = r.DateInit.Date.AddDays(i);

				decimal nightlyPrice = basePrice;

				// encontrar reglas que aplican a esta noche
				// Una regla aplica si la noche está >= DateInit y < DateFinish
				var applicableRules = rules.Where(rule =>
					currentDate >= rule.DateInit?.Date &&
					currentDate < rule.DateFinish?.Date);

				if (applicableRules.Any())
				{
					var totalPercentage = applicableRules.Sum(rule => rule.Percentage);

					nightlyPrice = basePrice * (1 + totalPercentage / 100m);
				}

				total += nightlyPrice;
			}

			// STEP 5: aplicar discount al total
			if (discountPercentage > 0)
			{
				total = total * (1 - Math.Min(discountPercentage, 100) / 100m);
			}

			return new PropertyPriceResponse { Id = r.PropertyId, Price = Math.Round(total, 2) };
		}
	}
}
