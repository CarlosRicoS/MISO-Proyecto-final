using Microsoft.AspNetCore.Mvc;
using PricingEngine.Database;
using PricingEngine.Models;
using PricingEngine.Models.Validators;

namespace PricingEngine.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class PropertyPriceController(IDatabaseOperations dbOps) : ControllerBase
	{
		[HttpGet("/propertyprice")]
		public async Task<IResult> GetPropertyPrice([FromQuery] PropertyPriceRequest request)
		{
			var validator = new GetPropertyPriceValidator();
			var result = await validator.ValidateAsync(request);
			if (!result.IsValid)
				return Results.BadRequest(result);
			return Results.Ok(await dbOps.CalculatePrice(request));
		}
	}
}
