import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

// TODO: Fetch actual blog posts and categories
// Example structure for a post preview (replace with actual data/component)
interface BlogPostPreviewProps {
  title: string;
  author?: string;
  date: string;
  category: string;
  excerpt: string;
  imageUrl?: string;
  slug: string;
}

function BlogPostPreview({ title, author, date, category, excerpt, imageUrl, slug }: BlogPostPreviewProps) {
  return (
    <article className="bg-gray-800/40 rounded-lg overflow-hidden shadow-lg transition-shadow hover:shadow-indigo-500/30">
      {imageUrl && (
        <Link href={`/blog/${slug}`}>
          {/* Replace with Next/Image if optimizing images */}
          <img src={imageUrl} alt="" className="w-full h-48 object-cover" />
        </Link>
      )}
      <div className="p-6">
        <div className="text-xs text-indigo-400 uppercase mb-2">
          <Link href={`/blog/category/${category.toLowerCase()}`}>{category}</Link>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          <Link href={`/blog/${slug}`}>{title}</Link>
        </h3>
        <p className="text-gray-400 text-sm mb-4 line-clamp-3">{excerpt}</p>
        <div className="text-xs text-gray-500">
          {author && <span>By {author} • </span>}
          <time dateTime={date}>{new Date(date).toLocaleDateString()}</time>
        </div>
      </div>
    </article>
  );
}

export default function BlogPage() {
  // Placeholder data - replace with fetched data
  const posts: BlogPostPreviewProps[] = [
    {
      title: "Example Post: Mastering Your Mix",
      author: "Sound Sage",
      date: "2024-03-15",
      category: "Production Tutorials",
      excerpt: "Dive deep into the essential techniques for achieving a polished and professional mix in your DAW...",
      imageUrl: "/placeholder-image.jpg", // Replace with actual image path
      slug: "mastering-your-mix"
    },
    // Add more placeholder posts...
  ];

  const categories = [
    "Production Tutorials",
    "Industry Insights",
    "Producer Spotlights",
    "Platform Updates",
    "Sound Spotlights"
  ];

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-gray-300">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Wavhaven Blog: Insights & Inspiration</h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Your source for music production tips, industry insights, producer spotlights, platform news, and sonic inspiration. Fuel your creativity.
        </p>
      </header>

      {/* Search and Filter Section - TODO: Implement functionality */}
      <section className="mb-12">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-sm">
            <Input
              type="search"
              placeholder="Search articles..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="ghost" size="sm" className="text-indigo-400 hover:bg-white/10 hover:text-indigo-300">All</Button>
            {categories.map(category => (
              <Button key={category} variant="ghost" size="sm" className="text-gray-400 hover:bg-white/10 hover:text-white">
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Post Listing Area */}
      <section>
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <BlogPostPreview key={post.slug} {...post} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No blog posts found.</p>
        )}
        {/* TODO: Add Pagination */} 
      </section>

      {/* Optional: Newsletter Signup */}
       {/* <section className="mt-16 py-12 bg-gray-800/30 rounded-lg text-center">
         <h2 className="text-2xl font-semibold text-white mb-4">Stay Connected</h2>
         <p className="text-gray-400 mb-6">Subscribe for updates and exclusive offers.</p>
         {/* Form embed or link */}
       {/* </section> */} 
    </div>
  );
} 