import { Star } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah Thompson',
    role: 'Founder, Bloom Marketing',
    image: 'ST',
    content:
      'SimpliBooks transformed how I manage my agency finances. The invoicing feature alone has saved me hours each week. Highly recommend!',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    role: 'Owner, Chen Consulting',
    image: 'MC',
    content:
      'As a consultant, I needed something simple yet powerful. SimpliBooks delivers exactly that. The bank reconciliation feature is a game-changer.',
    rating: 5,
  },
  {
    name: 'Emma Rodriguez',
    role: 'CEO, Artisan Bakery',
    image: 'ER',
    content:
      'Finally, accounting software that doesn\'t require a degree to use! The reports are beautiful and my accountant loves the export feature.',
    rating: 5,
  },
]

const Testimonials = () => {
  return (
    <section
      id="testimonials"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-100 to-white relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(16,185,129,0.1)_0%,transparent_50%)]" />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">
            Testimonials
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-900">
            Loved by Thousands of Business Owners
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            See what our customers have to say about their experience with
            SimpliBooks.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-600 mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-semibold">
                    {testimonial.image}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
