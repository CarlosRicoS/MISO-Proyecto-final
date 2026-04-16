package co.edu.uniandes.grupo03.proyectofinal.billing.contract.sqs.conf;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;

@Configuration
public class SqsClientConfiguration {

    @Value("${billing.listener.sqs.security.access-key}")
    private String accessKey;

    @Value("${billing.listener.sqs.security.secret-key}")
    private String secretKey;

    @Value("${billing.listener.sqs.region}")
    private String region;

    @Bean(destroyMethod = "close")
    public SqsClient sqsClient() {

        var credentials = AwsBasicCredentials.create(accessKey, secretKey);

        return SqsClient.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();
    }
}