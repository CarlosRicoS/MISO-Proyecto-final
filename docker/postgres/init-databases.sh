#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE DATABASE poc_properties;
  CREATE DATABASE booking;
  CREATE DATABASE "PricingRuleDB";
  CREATE DATABASE billing;
EOSQL
