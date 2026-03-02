using Microsoft.EntityFrameworkCore;
using PricingEngine.Database;

namespace PricingEngine
{
	public class Program
	{
		public static void Main(string[] args)
		{
			var builder = WebApplication.CreateBuilder(args);

			var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

			// Registro de DbContext con Npgsql
			builder.Services.AddDbContext<DatabaseContext>(options => options.UseNpgsql(connectionString));

			// Add services to the container.

			builder.Services.AddControllers();

			builder.Services.AddScoped<IDatabaseOperations, DatabaseOperations>();

			var app = builder.Build();

			// Ensure database is created
			using (var scope = app.Services.CreateScope())
			{
				var dbContext = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
				dbContext.Database.EnsureCreated();
			}

			// Configure the HTTP request pipeline.

			app.UseHttpsRedirection();

			app.UseAuthorization();

			app.MapControllers();

			app.Run();
		}
	}
}
