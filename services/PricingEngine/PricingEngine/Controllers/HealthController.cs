using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace PricingEngine.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class HealthController : ControllerBase
	{
		[HttpGet()]
		public IResult GetHealth()
		{
			return Results.Ok();
		}
	}
}
