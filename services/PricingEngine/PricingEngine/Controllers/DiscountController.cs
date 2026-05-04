using Microsoft.AspNetCore.Mvc;
using PricingEngine.Database;
using PricingEngine.Models;

namespace PricingEngine.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DiscountController(IDatabaseOperations dbOps) : ControllerBase
    {
        [HttpPost]
        public async Task<IResult> CreateDiscount([FromBody] CreateDiscountRequest request)
        {
            try
            {
                var result = await dbOps.CreateDiscount(request);
                return Results.Created($"/api/discount/{result.Id}", result);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IResult> GetDiscountById(Guid id)
        {
            try
            {
                var result = await dbOps.GetDiscountById(id);
                return Results.Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IResult> GetAllDiscounts()
        {
            var result = await dbOps.GetAllDiscounts();
            return Results.Ok(result);
        }

        [HttpPut("{id}")]
        public async Task<IResult> UpdateDiscount(Guid id, [FromBody] UpdateDiscountRequest request)
        {
            try
            {
                var result = await dbOps.UpdateDiscount(id, request);
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

        [HttpDelete("{id}")]
        public async Task<IResult> DeleteDiscount(Guid id)
        {
            try
            {
                await dbOps.DeleteDiscount(id);
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        }
    }
}
