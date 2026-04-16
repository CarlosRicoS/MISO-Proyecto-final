package co.edu.uniandes.grupo03.proyectofinal.billing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BillingApplication {

    static void main(String[] args) {
        SpringApplication.run(BillingApplication.class, args);
    }
}
