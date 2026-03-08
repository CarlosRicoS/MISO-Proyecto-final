using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PricingOrchestator.Models;
using PricingOrchestator.Models.Validators;

namespace PricingOrchestator.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class PropertyController(IHttpClientFactory httpClientFactory) : ControllerBase
	{
		private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
		private readonly string propertiesServiceUrl = Environment.GetEnvironmentVariable("PROPERTIES_ENGINE_URL") ?? throw new NullReferenceException("PROPERTIES_ENGINE_URL value is required");
		private readonly string pricingServiceUrl = Environment.GetEnvironmentVariable("PRICING_SERVICE_URL") ?? throw new NullReferenceException("PRICING_SERVICE_URL value is required");

		[HttpGet("/property")]
		public async Task<IResult> GetProperty([FromQuery] PropertyPriceRequest request)
		{
			var validator = new GetPropertyPriceValidator();
			var result = await validator.ValidateAsync(request);
			if (!result.IsValid)
				return Results.BadRequest(result);

			string propertiesEngineUrl = $"{propertiesServiceUrl}/api/property/{request.PropertyId}";
			string pricingEngineUrl = $"{pricingServiceUrl}/?guests={request.Guests}&dateInit={request.DateInit}&dateFinish={request.DateFinish}&discountCode={request.DiscountCode ?? string.Empty}&propertyId={request.PropertyId}";

			var propertyClient = _httpClientFactory.CreateClient();
			var pricingClient = _httpClientFactory.CreateClient();

			var tasks = new List<Task<HttpResponseMessage>>
			{
				propertyClient.GetAsync(propertiesEngineUrl),
				pricingClient.GetAsync(pricingEngineUrl)
			};

			var response = await Task.WhenAll(tasks);

			var propertyResponse = response[0];
			var pricingResponse = response[1];

			if (!propertyResponse.IsSuccessStatusCode || !pricingResponse.IsSuccessStatusCode)
				return Results.Problem("Failed to retrieve data from one or more services");

			// Read the response content
			var propertyData = await propertyResponse.Content.ReadFromJsonAsync<Property>();
			var pricingData = await pricingResponse.Content.ReadFromJsonAsync<Property>();
			propertyData!.Price = pricingData!.Price;

			return Results.Ok(propertyData);
		}
	}
}
