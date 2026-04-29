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
		[HttpGet()]
		public async Task<IResult> GetPropertyPrice([FromQuery] PropertyPriceRequest request)
		{
			var validator = new GetPropertyPriceValidator();
			var result = await validator.ValidateAsync(request);
			if (!result.IsValid)
				return Results.BadRequest(result);
			return Results.Ok(await dbOps.CalculatePrice(request));
		}

		// Pricing CRUD Operations

		[HttpPost("pricing")]
		public async Task<IResult> CreatePricing([FromBody] CreatePricingRequest request)
		{
			try
			{
				var result = await dbOps.CreatePricing(request);
				return Results.Created($"/api/propertyprice/pricing/{result.Id}", result);
			}
			catch (ArgumentException ex)
			{
				return Results.BadRequest(new { error = ex.Message });
			}
		}

		[HttpGet("pricing/{id}")]
		public async Task<IResult> GetPricingById(Guid id)
		{
			try
			{
				var result = await dbOps.GetPricingById(id);
				return Results.Ok(result);
			}
			catch (KeyNotFoundException ex)
			{
				return Results.NotFound(new { error = ex.Message });
			}
		}

		[HttpGet("pricing")]
		public async Task<IResult> GetAllPricings()
		{
			var result = await dbOps.GetAllPricings();
			return Results.Ok(result);
		}

		[HttpPut("pricing/{id}")]
		public async Task<IResult> UpdatePricing(Guid id, [FromBody] UpdatePricingRequest request)
		{
			try
			{
				var result = await dbOps.UpdatePricing(id, request);
				return Results.Ok(result);
			}
			catch (ArgumentException ex)
			{
				return Results.BadRequest(new { error = ex.Message });
			}
			catch (KeyNotFoundException ex)
			{
				return Results.NotFound(new { error = ex.Message });
			}
		}

		[HttpDelete("pricing/{id}")]
		public async Task<IResult> DeletePricing(Guid id)
		{
			try
			{
				await dbOps.DeletePricing(id);
				return Results.NoContent();
			}
			catch (KeyNotFoundException ex)
			{
				return Results.NotFound(new { error = ex.Message });
			}
		}

		// PricingRule CRUD Operations

		[HttpPost("pricing/{pricingId}/rules")]
		public async Task<IResult> CreatePricingRule(Guid pricingId, [FromBody] CreatePricingRuleRequest request)
		{
			try
			{
				var result = await dbOps.CreatePricingRule(pricingId, request);
				return Results.Created($"/api/propertyprice/pricing/{pricingId}/rules/{result.Id}", result);
			}
			catch (ArgumentException ex)
			{
				return Results.BadRequest(new { error = ex.Message });
			}
			catch (KeyNotFoundException ex)
			{
				return Results.NotFound(new { error = ex.Message });
			}
		}

		[HttpGet("pricing/{pricingId}/rules/{ruleId}")]
		public async Task<IResult> GetPricingRuleById(Guid pricingId, Guid ruleId)
		{
			try
			{
				var result = await dbOps.GetPricingRuleById(pricingId, ruleId);
				return Results.Ok(result);
			}
			catch (KeyNotFoundException ex)
			{
				return Results.NotFound(new { error = ex.Message });
			}
		}

		[HttpGet("pricing/{pricingId}/rules")]
		public async Task<IResult> GetPricingRulesByPricingId(Guid pricingId)
		{
			try
			{
				var result = await dbOps.GetPricingRulesByPricingId(pricingId);
				return Results.Ok(result);
			}
			catch (KeyNotFoundException ex)
			{
				return Results.NotFound(new { error = ex.Message });
			}
		}

		[HttpPut("pricing/{pricingId}/rules/{ruleId}")]
		public async Task<IResult> UpdatePricingRule(Guid pricingId, Guid ruleId, [FromBody] UpdatePricingRuleRequest request)
		{
			try
			{
				var result = await dbOps.UpdatePricingRule(pricingId, ruleId, request);
				return Results.Ok(result);
			}
			catch (ArgumentException ex)
			{
				return Results.BadRequest(new { error = ex.Message });
			}
			catch (KeyNotFoundException ex)
			{
				return Results.NotFound(new { error = ex.Message });
			}
		}

		[HttpDelete("pricing/{pricingId}/rules/{ruleId}")]
		public async Task<IResult> DeletePricingRule(Guid pricingId, Guid ruleId)
		{
			try
			{
				await dbOps.DeletePricingRule(pricingId, ruleId);
				return Results.NoContent();
			}
			catch (KeyNotFoundException ex)
			{
				return Results.NotFound(new { error = ex.Message });
			}
		}
	}
}
