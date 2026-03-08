using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace PricingOrchestator.Controllers
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
