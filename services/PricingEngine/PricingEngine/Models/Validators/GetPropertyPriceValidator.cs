using FluentValidation;

namespace PricingEngine.Models.Validators
{
	public class GetPropertyPriceValidator : AbstractValidator<PropertyPriceRequest>
	{
		public GetPropertyPriceValidator()
		{
			// PropertyId requerido y no vacío

			RuleFor(x => x.PropertyId)
				.NotEmpty()
				.WithMessage("PropertyId is required.");

			// Guests > 0
			RuleFor(x => x.Guests)
				.GreaterThan(0)
				.WithMessage("Guests must be greater than 0.");

			// DateInit >= hoy
			RuleFor(x => x.DateInit)
				.Must(BeTodayOrFuture)
				.WithMessage("DateInit must be today or in the future.");

			// DateFinish > DateInit
			RuleFor(x => x.DateFinish)
				.GreaterThan(x => x.DateInit)
				.WithMessage("DateFinish must be greater than DateInit.");

			// DateFinish requerido
			RuleFor(x => x.DateFinish)
				.NotEmpty()
				.WithMessage("DateFinish is required.");

		}

		private bool BeTodayOrFuture(DateTime date)
		{
			return date.Date >= new DateTime(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day, 0, 0, 0);
		}
	}
}
