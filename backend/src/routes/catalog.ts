import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /api/catalog/:slug - Get catalog by store slug (public)
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    // Find the store by slug
    const store = await prisma.store.findUnique({
      where: { slug },
    });

    if (!store || !store.isActive) {
      return res.status(404).json({ error: "Catálogo no encontrado" });
    }

    // Extract query params for filtering and pagination
    const {
      category,
      room,
      style,
      search,
      priceMin,
      priceMax,
      arOnly,
      sort = "createdAt",
      direction = "desc",
      page = "1",
      pageSize = "12",
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limit = parseInt(pageSize as string, 10);
    const skip = (pageNum - 1) * limit;

    // Build where clause
    const whereCondition: any = {
      storeId: store.id,
      inStock: true,
    };

    if (category) whereCondition.category = String(category);
    if (room) whereCondition.room = String(room);
    if (style) whereCondition.style = String(style);
    if (search) {
      whereCondition.name = { contains: String(search), mode: "insensitive" };
    }
    if (priceMin || priceMax) {
      whereCondition.price = {};
      if (priceMin) whereCondition.price.gte = parseFloat(String(priceMin));
      if (priceMax) whereCondition.price.lte = parseFloat(String(priceMax));
    }
    if (arOnly === "true") {
      whereCondition.OR = [
        { arUrl: { not: null } },
        { glbUrl: { not: null } },
        { usdzUrl: { not: null } },
      ];
    }

    // Get total count for pagination
    const total = await prisma.product.count({
      where: whereCondition,
    });

    // Get products with pagination
    const products = await prisma.product.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        category: true,
        room: true,
        style: true,
        imageUrl: true,
        images: {
          select: {
            url: true,
            position: true,
            type: true,
          },
        },
        arUrl: true,
        glbUrl: true,
        usdzUrl: true,
        widthCm: true,
        depthCm: true,
        heightCm: true,
        material: true,
        color: true,
      },
      orderBy: {
        [String(sort)]: String(direction) === "asc" ? "asc" : "desc",
      },
      skip,
      take: limit,
    });

    return res.json({
      data: {
        store: {
          id: store.id,
          name: store.name,
          slug: store.slug,
          description: store.description,
          whatsapp: store.whatsapp,
          whatsappNumber: store.whatsappNumber,
          phone: store.phone,
          email: store.email,
          address: store.address,
          city: store.city,
          province: store.province,
          logoUrl: store.logoUrl,
          website: store.website,
          socialInstagram: store.socialInstagram,
          socialFacebook: store.socialFacebook,
        },
        products,
        pagination: {
          page: pageNum,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error("Error fetching catalog:", err);
    return res.status(500).json({ error: "Error al obtener el catálogo" });
  }
});

// GET /api/catalog/:storeSlug/:productSlug - Get specific product from catalog (public)
router.get("/:storeSlug/:productSlug", async (req, res) => {
  try {
    const { storeSlug, productSlug } = req.params;

    // Find the store
    const store = await prisma.store.findUnique({
      where: { slug: storeSlug },
    });

    if (!store) {
      return res.status(404).json({ error: "Tienda no encontrada" });
    }

    // Find the product
    const product = await prisma.product.findFirst({
      where: {
        slug: productSlug,
        storeId: store.id,
        inStock: true,
      },
      include: {
        images: {
          select: {
            url: true,
            position: true,
            type: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.json({
      ...product,
      images: product.images.map((img) => ({
        url: img.url,
        position: img.position,
        type: img.type,
      })),
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        whatsapp: store.whatsapp,
        address: store.address,
        logoUrl: store.logoUrl,
      },
    });
  } catch (err) {
    console.error("Error fetching catalog product:", err);
    return res.status(500).json({ error: "Error al obtener el producto" });
  }
});

export default router;
