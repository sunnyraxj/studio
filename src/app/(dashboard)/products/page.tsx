import { getProducts } from "@/lib/api";
import { ProductTable } from "@/components/products/product-table";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          Manage your product catalog and inventory.
        </p>
      </div>
      <ProductTable data={products} />
    </div>
  );
}
