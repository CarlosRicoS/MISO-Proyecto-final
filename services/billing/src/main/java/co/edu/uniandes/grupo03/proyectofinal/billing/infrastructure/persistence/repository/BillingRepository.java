package co.edu.uniandes.grupo03.proyectofinal.billing.infrastructure.persistence.repository;

import co.edu.uniandes.grupo03.proyectofinal.billing.infrastructure.persistence.entity.BillingEntity;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface BillingRepository extends CrudRepository<BillingEntity, String> {

    Optional<BillingEntity> findByBookingId(String bookingId);
}
