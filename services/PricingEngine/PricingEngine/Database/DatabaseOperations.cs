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

		// Pricing CRUD Operations

		public async Task<PricingResponse> CreatePricing(CreatePricingRequest request)
		{
			if (request.BasePrice <= 0)
				throw new ArgumentException("BasePrice must be greater than 0");

			var pricing = new Pricing
			{
				Id = Guid.NewGuid(),
				BasePrice = request.BasePrice,
				PropertyId = request.PropertyId
			};

			context.Pricings.Add(pricing);
			await context.SaveChangesAsync();

			return new PricingResponse
			{
				Id = pricing.Id,
				BasePrice = pricing.BasePrice,
				PropertyId = pricing.PropertyId
			};
		}

		public async Task<PricingResponse> GetPricingById(Guid id)
		{
			var pricing = await context.Pricings.FindAsync(id) 
				?? throw new KeyNotFoundException($"Pricing with id {id} not found");

			return new PricingResponse
			{
				Id = pricing.Id,
				BasePrice = pricing.BasePrice,
				PropertyId = pricing.PropertyId
			};
		}

		public async Task<List<PricingResponse>> GetAllPricings()
		{
			var pricings = await context.Pricings
				.Select(p => new PricingResponse
				{
					Id = p.Id,
					BasePrice = p.BasePrice,
					PropertyId = p.PropertyId
				})
				.ToListAsync();

			return pricings;
		}

		public async Task<PricingResponse> UpdatePricing(Guid id, UpdatePricingRequest request)
		{
			if (request.BasePrice <= 0)
				throw new ArgumentException("BasePrice must be greater than 0");

			var pricing = await context.Pricings.FindAsync(id)
				?? throw new KeyNotFoundException($"Pricing with id {id} not found");

			pricing.BasePrice = request.BasePrice;
			pricing.PropertyId = request.PropertyId;

			context.Pricings.Update(pricing);
			await context.SaveChangesAsync();

			return new PricingResponse
			{
				Id = pricing.Id,
				BasePrice = pricing.BasePrice,
				PropertyId = pricing.PropertyId
			};
		}

		public async Task<bool> DeletePricing(Guid id)
		{
			var pricing = await context.Pricings
				.Include(p => p.PricingRules)
				.FirstOrDefaultAsync(p => p.Id == id)
				?? throw new KeyNotFoundException($"Pricing with id {id} not found");

			// Delete associated PricingRules
			context.PricingRules.RemoveRange(pricing.PricingRules);
			context.Pricings.Remove(pricing);
			await context.SaveChangesAsync();

			return true;
		}

		// PricingRule CRUD Operations

		public async Task<PricingRuleResponse> CreatePricingRule(Guid pricingId, CreatePricingRuleRequest request)
		{
			if (request.Percentage < 0 || request.Percentage > 100)
				throw new ArgumentException("Percentage must be between 0 and 100");

			// Verify that the Pricing exists
			var pricing = await context.Pricings.FindAsync(pricingId)
				?? throw new KeyNotFoundException($"Pricing with id {pricingId} not found");

			var rule = new PricingRule
			{
				Id = Guid.NewGuid(),
				PriceId = pricingId,
				DateInit = request.DateInit,
				DateFinish = request.DateFinish,
				MinGuests = request.MinGuests,
				MaxGuests = request.MaxGuests,
				Percentage = request.Percentage
			};

			context.PricingRules.Add(rule);
			await context.SaveChangesAsync();

			return new PricingRuleResponse
			{
				Id = rule.Id,
				PriceId = rule.PriceId,
				DateInit = rule.DateInit,
				DateFinish = rule.DateFinish,
				MinGuests = rule.MinGuests,
				MaxGuests = rule.MaxGuests,
				Percentage = rule.Percentage
			};
		}

		public async Task<PricingRuleResponse> GetPricingRuleById(Guid pricingId, Guid ruleId)
		{
			var rule = await context.PricingRules
				.FirstOrDefaultAsync(r => r.Id == ruleId && r.PriceId == pricingId)
				?? throw new KeyNotFoundException($"PricingRule with id {ruleId} not found for Pricing {pricingId}");

			return new PricingRuleResponse
			{
				Id = rule.Id,
				PriceId = rule.PriceId,
				DateInit = rule.DateInit,
				DateFinish = rule.DateFinish,
				MinGuests = rule.MinGuests,
				MaxGuests = rule.MaxGuests,
				Percentage = rule.Percentage
			};
		}

		public async Task<List<PricingRuleResponse>> GetPricingRulesByPricingId(Guid pricingId)
		{
			// Verify that the Pricing exists
			var pricing = await context.Pricings.FindAsync(pricingId)
				?? throw new KeyNotFoundException($"Pricing with id {pricingId} not found");

			var rules = await context.PricingRules
				.Where(r => r.PriceId == pricingId)
				.Select(r => new PricingRuleResponse
				{
					Id = r.Id,
					PriceId = r.PriceId,
					DateInit = r.DateInit,
					DateFinish = r.DateFinish,
					MinGuests = r.MinGuests,
					MaxGuests = r.MaxGuests,
					Percentage = r.Percentage
				})
				.ToListAsync();

			return rules;
		}

		public async Task<PricingRuleResponse> UpdatePricingRule(Guid pricingId, Guid ruleId, UpdatePricingRuleRequest request)
		{
			if (request.Percentage < 0 || request.Percentage > 100)
				throw new ArgumentException("Percentage must be between 0 and 100");

			var rule = await context.PricingRules
				.FirstOrDefaultAsync(r => r.Id == ruleId && r.PriceId == pricingId)
				?? throw new KeyNotFoundException($"PricingRule with id {ruleId} not found for Pricing {pricingId}");

			rule.DateInit = request.DateInit;
			rule.DateFinish = request.DateFinish;
			rule.MinGuests = request.MinGuests;
			rule.MaxGuests = request.MaxGuests;
			rule.Percentage = request.Percentage;

			context.PricingRules.Update(rule);
			await context.SaveChangesAsync();

			return new PricingRuleResponse
			{
				Id = rule.Id,
				PriceId = rule.PriceId,
				DateInit = rule.DateInit,
				DateFinish = rule.DateFinish,
				MinGuests = rule.MinGuests,
				MaxGuests = rule.MaxGuests,
				Percentage = rule.Percentage
			};
		}

		public async Task<bool> DeletePricingRule(Guid pricingId, Guid ruleId)
		{
			var rule = await context.PricingRules
				.FirstOrDefaultAsync(r => r.Id == ruleId && r.PriceId == pricingId)
				?? throw new KeyNotFoundException($"PricingRule with id {ruleId} not found for Pricing {pricingId}");

			context.PricingRules.Remove(rule);
			await context.SaveChangesAsync();

			return true;
		}
	}
}
