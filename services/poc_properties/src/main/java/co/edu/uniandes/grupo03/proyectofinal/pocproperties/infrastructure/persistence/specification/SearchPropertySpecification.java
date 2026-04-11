package co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.specification;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.LockedPropertyEntity;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.PropertyDetailEntity;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.text.Normalizer;
import java.util.Locale;

public final class SearchPropertySpecification {

    private SearchPropertySpecification() {
    }

    public static Specification<PropertyDetailEntity> findPropertiesByStartDate(LocalDate startDate) {

        return (root, query, cb) -> {

            Subquery<Integer> subquery = query.subquery(Integer.class);
            Root<LockedPropertyEntity> lockedRoot = subquery.from(LockedPropertyEntity.class);

            Predicate correlation = cb.equal(lockedRoot.get("propertyDetail"), root);

            Predicate dateFilters = cb.and(
                    cb.greaterThanOrEqualTo(lockedRoot.get("startDate"), startDate),
                    cb.lessThanOrEqualTo(lockedRoot.get("endDate"), startDate.plusDays(1))
            );

            subquery.select(cb.literal(1))
                    .where(cb.and(correlation, dateFilters));

            return cb.and(cb.not(cb.exists(subquery)));
        };
    }

    public static Specification<PropertyDetailEntity> findPropertiesByCity(String city) {

        return (root, query, cb) -> cb.and(
                cb.equal(normalizeCityExpression(root, cb), normalizeCityValue(city))
        );
    }

    public static Specification<PropertyDetailEntity> findPropertiesByCapacity(int capacity) {

        return (root, query, cb) -> cb.and(
                cb.equal(root.get("maxCapacity"), capacity)
        );
    }

    public static Specification<PropertyDetailEntity> findAll() {

        return Specification.unrestricted();
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

            subquery.select(cb.literal(1))
                    .where(cb.and(correlation, dateFilters));

            return cb.and(
                    cb.equal(normalizeCityExpression(root, cb), normalizeCityValue(city)),
                    cb.equal(root.get("maxCapacity"), maxCapacity),
                    cb.not(cb.exists(subquery))
            );
        };
    }

    private static Expression<String> normalizeCityExpression(Root<PropertyDetailEntity> root,
                                                              jakarta.persistence.criteria.CriteriaBuilder cb) {
        return cb.lower(root.get("city"));
    }

    private static String normalizeCityValue(String city) {
        return Normalizer.normalize(city, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
    }
}
