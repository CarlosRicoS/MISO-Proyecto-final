using System.Text.Json.Serialization;

namespace PricingOrchestator.Models
{
	public class Property
	{
		[JsonPropertyName("id")]
		public Guid Id { get; set; }

		[JsonPropertyName("name")]
		public string Name { get; set; }

		[JsonPropertyName("maxCapacity")]
		public int MaxCapacity { get; set; }

		[JsonPropertyName("description")]
		public string Description { get; set; }

		[JsonPropertyName("urlBucketPhotos")]
		public string UrlBucketPhotos { get; set; }

		[JsonPropertyName("checkInTime")]
		public TimeOnly CheckInTime { get; set; }

		[JsonPropertyName("checkOutTime")]
		public TimeOnly CheckOutTime { get; set; }

		[JsonPropertyName("adminGroupId")]
		public string AdminGroupId { get; set; }

		[JsonPropertyName("price")]
		public decimal Price { get; set; }

	}
}
