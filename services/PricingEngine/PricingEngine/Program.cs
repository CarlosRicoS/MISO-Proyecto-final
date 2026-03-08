using Microsoft.EntityFrameworkCore;
using PricingEngine.Database;

namespace PricingEngine
{
	public class Program
	{
		public static void Main(string[] args)
		{
			var builder = WebApplication.CreateBuilder(args);

			var dbHost = builder.Configuration["DB_HOST"];
			var dbName = builder.Configuration["DB_NAME"];
			var dbUsername = builder.Configuration["DB_USERNAME"];
			var dbPassword = builder.Configuration["DB_PASSWORD"];
			var dbPort = builder.Configuration["DB_PORT"];

			var connectionString = $"Host={dbHost};Port=5432;Database={dbName};Username={dbUsername};Password={dbPassword}";

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
