using FluentValidation.Results;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Options;
using NSubstitute;
using PricingOrchestator;
using PricingOrchestator.Controllers;
using PricingOrchestator.Models;
using System.Net;
using System.Text;
using System.Text.Json;

namespace PricingOrchestatorTests
{
	[TestFixture]
	public class PropertyControllerTests
	{
		private IOptions<AppSettings> _options;
		private IHttpClientFactory _httpClientFactory;
		private AppSettings _appSettings;
		private PropertyController _controller;
		private HttpClient _httpClient;
		private TestHttpMessageHandler _messageHandler;

		[SetUp]
		public void Setup()
		{
			_appSettings = new AppSettings
			{
				PropertiesEngineUrl = "https://properties-engine.test",
				PricingEngineUrl = "https://pricing-engine.test"
			};

			_options = Substitute.For<IOptions<AppSettings>>();
			_options.Value.Returns(_appSettings);

			_messageHandler = new TestHttpMessageHandler();
			_httpClient = new HttpClient(_messageHandler);

			_httpClientFactory = Substitute.For<IHttpClientFactory>();
			_httpClientFactory.CreateClient(Arg.Any<string>()).Returns(_httpClient);

			_controller = new PropertyController(_options, _httpClientFactory);
		}

		[TearDown]
		public void TearDown()
		{
			_httpClient?.Dispose();
			_messageHandler?.Dispose();
		}

		[Test]
		public async Task GetProperty_WithEmptyPropertyId_ReturnsBadRequest()
		{
			// Arrange
			var invalidRequest = new PropertyPriceRequest
			{
				PropertyId = Guid.Empty,
				Guests = 2,
				DateInit = DateTime.Now.AddDays(1),
				DateFinish = DateTime.Now.AddDays(5)
			};

			// Act
			var result = await _controller.GetProperty(invalidRequest);

			// Assert
			Assert.That(result, Is.InstanceOf<BadRequest<ValidationResult>>());
		}

		[Test]
		public async Task GetProperty_WithZeroGuests_ReturnsBadRequest()
		{
			// Arrange
			var invalidRequest = new PropertyPriceRequest
			{
				PropertyId = Guid.NewGuid(),
				Guests = 0,
				DateInit = DateTime.Now.AddDays(1),
				DateFinish = DateTime.Now.AddDays(5)
			};

			// Act
			var result = await _controller.GetProperty(invalidRequest);

			// Assert
			Assert.That(result, Is.InstanceOf<BadRequest<ValidationResult>>());
		}

		[Test]
		public async Task GetProperty_WithNegativeGuests_ReturnsBadRequest()
		{
			// Arrange
			var invalidRequest = new PropertyPriceRequest
			{
				PropertyId = Guid.NewGuid(),
				Guests = -1,
				DateInit = DateTime.Now.AddDays(1),
				DateFinish = DateTime.Now.AddDays(5)
			};

			// Act
			var result = await _controller.GetProperty(invalidRequest);

			// Assert
			Assert.That(result, Is.InstanceOf<BadRequest<ValidationResult>>());
		}

		[Test]
		public async Task GetProperty_WithPastDateInit_ReturnsBadRequest()
		{
			// Arrange
			var invalidRequest = new PropertyPriceRequest
			{
				PropertyId = Guid.NewGuid(),
				Guests = 2,
				DateInit = DateTime.Now.AddDays(-1),
				DateFinish = DateTime.Now.AddDays(5)
			};

			// Act
			var result = await _controller.GetProperty(invalidRequest);

			// Assert
			Assert.That(result, Is.InstanceOf<BadRequest<ValidationResult>>());
		}

		[Test]
		public async Task GetProperty_WithDateFinishBeforeDateInit_ReturnsBadRequest()
		{
			// Arrange
			var invalidRequest = new PropertyPriceRequest
			{
				PropertyId = Guid.NewGuid(),
				Guests = 2,
				DateInit = DateTime.Now.AddDays(5),
				DateFinish = DateTime.Now.AddDays(1)
			};

			// Act
			var result = await _controller.GetProperty(invalidRequest);

			// Assert
			Assert.That(result, Is.InstanceOf<BadRequest<ValidationResult>>());
		}

		[Test]
		public async Task GetProperty_WithValidRequest_ReturnsOkWithPropertyData()
		{
			// Arrange
			var propertyId = Guid.NewGuid();
			var validRequest = new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = DateTime.Now.AddDays(1),
				DateFinish = DateTime.Now.AddDays(5),
				DiscountCode = "DISCOUNT10"
			};

			var propertyData = new Property
			{
				Id = propertyId,
				Name = "Estudio 1",
				MaxCapacity = 2,
				Description = "Test property",
				UrlBucketPhotos = "url/1",
				CheckInTime = new TimeOnly(14, 0, 0),
				CheckOutTime = new TimeOnly(11, 0, 0),
				AdminGroupId = "1",
				Price = 0
			};

			var pricingData = new Property
			{
				Price = 150.50M
			};

			_messageHandler.AddResponse(new HttpResponseMessage
			{
				StatusCode = HttpStatusCode.OK,
				Content = new StringContent(JsonSerializer.Serialize(propertyData), Encoding.UTF8, "application/json")
			});

			_messageHandler.AddResponse(new HttpResponseMessage
			{
				StatusCode = HttpStatusCode.OK,
				Content = new StringContent(JsonSerializer.Serialize(pricingData), Encoding.UTF8, "application/json")
			});

			// Act
			var result = await _controller.GetProperty(validRequest);

			// Assert
			Assert.That(result, Is.InstanceOf<Ok<Property>>());
			var okResult = result as Ok<Property>;
			Assert.That(okResult!.Value!.Price, Is.EqualTo(150.50));
			Assert.That(okResult.Value.Name, Is.EqualTo("Estudio 1"));
		}

		[Test]
		public async Task GetProperty_WhenPropertyServiceFails_ReturnsProblem()
		{
			// Arrange
			var validRequest = new PropertyPriceRequest
			{
				PropertyId = Guid.NewGuid(),
				Guests = 2,
				DateInit = DateTime.Now.AddDays(1),
				DateFinish = DateTime.Now.AddDays(5)
			};

			_messageHandler.AddResponse(new HttpResponseMessage
			{
				StatusCode = HttpStatusCode.InternalServerError
			});

			_messageHandler.AddResponse(new HttpResponseMessage
			{
				StatusCode = HttpStatusCode.OK,
				Content = new StringContent("{\"price\": 100}", Encoding.UTF8, "application/json")
			});

			// Act
			var result = await _controller.GetProperty(validRequest);

			// Assert
			Assert.That(result, Is.InstanceOf<ProblemHttpResult>());
		}

		[Test]
		public async Task GetProperty_WhenPricingServiceFails_ReturnsProblem()
		{
			// Arrange
			var validRequest = new PropertyPriceRequest
			{
				PropertyId = Guid.NewGuid(),
				Guests = 2,
				DateInit = DateTime.Now.AddDays(1),
				DateFinish = DateTime.Now.AddDays(5)
			};

			var propertyData = new Property { Id = Guid.NewGuid(), Name = "Test", Price = 0 };

			_messageHandler.AddResponse(new HttpResponseMessage
			{
				StatusCode = HttpStatusCode.OK,
				Content = new StringContent(JsonSerializer.Serialize(propertyData), Encoding.UTF8, "application/json")
			});

			_messageHandler.AddResponse(new HttpResponseMessage
			{
				StatusCode = HttpStatusCode.NotFound
			});

			// Act
			var result = await _controller.GetProperty(validRequest);

			// Assert
			Assert.That(result, Is.InstanceOf<ProblemHttpResult>());
		}

		[Test]
		public async Task GetProperty_CallsCorrectUrls()
		{
			// Arrange
			var propertyId = Guid.NewGuid();
			var validRequest = new PropertyPriceRequest
			{
				PropertyId = propertyId,
				Guests = 2,
				DateInit = DateTime.Now.AddDays(1),
				DateFinish = DateTime.Now.AddDays(5),
				DiscountCode = "TEST"
			};

			var propertyData = new Property { Id = propertyId, Price = 0 };
			var pricingData = new Property { Price = 100 };

			_messageHandler.AddResponse(new HttpResponseMessage
			{
				StatusCode = HttpStatusCode.OK,
				Content = new StringContent(JsonSerializer.Serialize(propertyData), Encoding.UTF8, "application/json")
			});

			_messageHandler.AddResponse(new HttpResponseMessage
			{
				StatusCode = HttpStatusCode.OK,
				Content = new StringContent(JsonSerializer.Serialize(pricingData), Encoding.UTF8, "application/json")
			});

			// Act
			await _controller.GetProperty(validRequest);

			// Assert
			var requestedUrls = _messageHandler.RequestedUrls;
			Assert.That(requestedUrls, Has.Count.EqualTo(2));
			Assert.That(requestedUrls[0], Does.Contain($"/api/property/{propertyId}"));
			Assert.That(requestedUrls[1], Does.Contain("guests=2"));
			Assert.That(requestedUrls[1], Does.Contain("discountCode=TEST"));
		}
	}

	// Helper class to mock HttpMessageHandler
	public class TestHttpMessageHandler : HttpMessageHandler
	{
		private readonly Queue<HttpResponseMessage> _responses = new();
		public List<string> RequestedUrls { get; } = new();

		public void AddResponse(HttpResponseMessage response)
		{
			_responses.Enqueue(response);
		}

		protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
		{
			RequestedUrls.Add(request.RequestUri?.ToString() ?? string.Empty);

			if (_responses.Count == 0)
			{
				return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
			}

			return Task.FromResult(_responses.Dequeue());
		}
	}
}