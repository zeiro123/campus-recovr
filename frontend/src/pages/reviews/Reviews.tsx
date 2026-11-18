import { FaQuoteLeft, FaUser } from "react-icons/fa";
import StarRatings from "react-star-ratings";

interface Testimonial {
  rating: number;
  feedback: string;
  name: string;
  position: string;
}

const testimonials: Testimonial[] = [
  {
    rating: 5,
    feedback:
      "This platform saved me $20 — I found my lost ID in just a few days after listing it!",
    name: "Tinotenda Sithole",
    position: "Student, Faculty of Science",
  },
  {
    rating: 4.5,
    feedback:
      "I found a charger cable in the library and listed it here — the owner reached out the very same day.",
    name: "Tanaka Chigura",
    position: "Student, Faculty of Engineering",
  },
  {
    rating: 5,
    feedback:
      "This app is saving us a lot of money. Kudos to the guys who created it!",
    name: "Thomas Tavengwa",
    position: "Student, Faculty of Commerce",
  },
  {
    rating: 3.5,
    feedback:
      "Lost my student ID at the cafeteria and had it back before the week ended. Works like magic!",
    name: "Trinity Tauro",
    position: "Student, Faculty of Law",
  },
];

const ReviewCard = ({ testimonial }: { testimonial: Testimonial }) => (
  <figure className="card flex w-80 shrink-0 flex-col items-center gap-5 p-6 text-center sm:w-96">
    <div className="grid h-14 w-14 place-items-center rounded-full bg-surface-3 text-ink-mute">
      <FaUser size="20" />
    </div>

    <figcaption>
      <p className="text-base font-semibold text-ink">{testimonial.name}</p>
      <p className="mt-0.5 text-sm text-ink-mute">{testimonial.position}</p>
    </figcaption>

    <div className="flex justify-center">
      <StarRatings
        rating={testimonial.rating}
        starDimension="20px"
        starSpacing="2px"
        starRatedColor="#F87D0D"
      />
    </div>

    <blockquote className="text-sm leading-relaxed text-ink-dim">
      "{testimonial.feedback}"
    </blockquote>
  </figure>
);

const Reviews = () => {
  // Two copies back-to-back so the -50% translate loops seamlessly.
  const loop = [...testimonials, ...testimonials];

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="section-head">
          <span className="eyebrow">
            <FaQuoteLeft />
            Testimonials
          </span>
          <h2 className="section-title">What UZ Students Say</h2>
          <p className="section-sub">
            Hear from the students who got their belongings back on Campus
            RecovR
          </p>
        </div>
      </div>

      {/* Sliding marquee — pauses on hover */}
      <div
        className="marquee-paused overflow-hidden"
        aria-label="Student testimonials"
      >
        <div className="animate-marquee flex w-max gap-6 px-4 py-2">
          {loop.map((testimonial, i) => (
            <ReviewCard
              key={`${testimonial.name}-${i}`}
              testimonial={testimonial}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
export default Reviews;
