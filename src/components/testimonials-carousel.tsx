import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    name: "Rakib H.",
    role: "Student, Dhaka",
    text: "AxoraBD theke prothom 7 dine ৳1,200 income korechi. Withdraw ekdom fast — bKash e ekdiner moddhe pelam!",
    avatar: "R",
    color: "from-blue-500 to-blue-700",
  },
  {
    name: "Nadia A.",
    role: "Freelancer, Chittagong",
    text: "Khub valo task quality, payment regular. Customer support 24 ghonta active. Recommend korlam friends der.",
    avatar: "N",
    color: "from-pink-500 to-rose-700",
  },
  {
    name: "Sami R.",
    role: "Part-time earner",
    text: "Phone diye easy kaaj kora jay. Daily check-in bonus ta amar favourite. Streak ekhono unbroken!",
    avatar: "S",
    color: "from-emerald-500 to-emerald-700",
  },
  {
    name: "Tasnia K.",
    role: "Homemaker, Sylhet",
    text: "Ghore boshe extra income er sera platform. Publisher accept korlei sathe sathe balance dekha jay.",
    avatar: "T",
    color: "from-amber-500 to-orange-700",
  },
  {
    name: "Junaed I.",
    role: "Publisher",
    text: "Amar product er social engagement onek bere geche AxoraBD use kore. Highly recommended.",
    avatar: "J",
    color: "from-purple-500 to-violet-700",
  },
];

export function TestimonialsCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    const id = setInterval(() => emblaApi.scrollNext(), 4500);
    return () => {
      clearInterval(id);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {testimonials.map((t, i) => (
            <div key={i} className="shrink-0 w-full sm:w-1/2 lg:w-1/3 px-3">
              <article className="h-full rounded-2xl border bg-card p-6 relative overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all hover:-translate-y-1">
                <Quote className="absolute top-4 right-4 h-10 w-10 text-primary/10" />
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${t.color} text-white grid place-items-center font-bold shadow-md`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, k) => (
                    <Star key={k} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">"{t.text}"</p>
              </article>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mt-6">
        <button
          onClick={() => emblaApi?.scrollPrev()}
          aria-label="Previous"
          className="h-9 w-9 rounded-full border bg-card hover:bg-accent grid place-items-center transition"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-1.5">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={
                "h-2 rounded-full transition-all " +
                (i === selected ? "w-6 bg-primary" : "w-2 bg-muted")
              }
            />
          ))}
        </div>
        <button
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Next"
          className="h-9 w-9 rounded-full border bg-card hover:bg-accent grid place-items-center transition"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
