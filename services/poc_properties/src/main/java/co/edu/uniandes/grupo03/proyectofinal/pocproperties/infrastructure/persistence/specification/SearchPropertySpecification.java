package co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.specification;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.LockedPropertyEntity;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.PropertyDetailEntity;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public final class SearchPropertySpecification {

    private SearchPropertySpecification() {
    }

    public static Specification<PropertyDetailEntity> findAvailableProperties(
            String city,
            Integer maxCapacity,
            LocalDate startDate,
            LocalDate endDate) {

        return (root, query, cb) -> {

            Subquery<Integer> subquery = query.subquery(Integer.class);
            Root<LockedPropertyEntity> lockedRoot = subquery.from(LockedPropertyEntity.class);

            Predicate correlation = cb.equal(lockedRoot.get("propertyDetail"), root);

            Predicate dateFilters = cb.and(
                    cb.greaterThanOrEqualTo(lockedRoot.get("startDate"), startDate),
                    cb.lessThanOrEqualTo(lockedRoot.get("endDate"), endDate)
            );

            subquery.select(cb.literal(1)) // Select 1
                    .where(cb.and(correlation, dateFilters));

            // 4. Main Query: city, capacity AND NOT EXISTS
            return cb.and(
                    cb.equal(root.get("city"), city),
                    cb.equal(root.get("maxCapacity"), maxCapacity),
                    cb.not(cb.exists(subquery)) // <-- AQUÍ está el NOT EXISTS
            );
        };
    }
}
