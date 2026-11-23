-- Trigger to automatically delete corresponding customer in "customers" table when a user is deleted from "users" table.
CREATE OR REPLACE FUNCTION delete_customer_on_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email IS NOT NULL AND OLD.email <> '' THEN
    DELETE FROM "customers" WHERE LOWER("email") = LOWER(OLD.email);
  END IF;

  IF OLD.phone IS NOT NULL AND OLD.phone <> '' THEN
    DELETE FROM "customers" WHERE "phone" = OLD.phone;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delete_customer_on_user_delete ON "users";

CREATE TRIGGER trigger_delete_customer_on_user_delete
AFTER DELETE ON "users"
FOR EACH ROW
EXECUTE FUNCTION delete_customer_on_user_delete();
