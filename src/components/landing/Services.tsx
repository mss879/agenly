"use client";


const useCases = [
  {
    num: "01",
    tag: "E-COMMERCE",
    title: "Online Stores",
    desc: "Turn product pages into conversations. Your agent knows your catalog, answers sizing questions, compares products, and guides shoppers to checkout — 24/7.",
    bullets: ["Pre-sale product Q&A", "Order and return policy support", "Instant answers from your product docs", "Works on Shopify and any storefront"],
  },
  {
    num: "02",
    tag: "SAAS & STARTUPS",
    title: "Software Products",
    desc: "Replace your static help center with an agent that actually reads your docs. Reduce tickets, speed up onboarding, and let your team focus on building.",
    bullets: ["Documentation-trained support", "Cuts support ticket volume", "Onboarding guidance for new users", "Embeds into your existing app"],
  },
  {
    num: "03",
    tag: "AGENCIES",
    title: "Client Projects",
    desc: "Build AI agents for your clients in minutes, not weeks. White-label ready, isolated per project, deployed with a single snippet. Scale your offering without scaling your team.",
    bullets: ["Build once, deploy to client sites", "Fully isolated per client", "No engineering resources needed", "New revenue stream for your agency"],
  },
  {
    num: "04",
    tag: "CONTENT & MEDIA",
    title: "Blogs & Publishers",
    desc: "Let readers ask questions about your content instead of searching. Your agent surfaces the right article, the right answer, at the right moment.",
    bullets: ["Crawl and index entire content libraries", "Natural language content discovery", "Keeps visitors engaged longer", "Works on WordPress and custom CMS"],
  },
];

export default function Services() {
  return (
    <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-white text-gray-900 relative z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20 lg:mb-32">
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-[0.3em] mb-6">Use Cases</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-beras uppercase tracking-wide leading-[1.1] text-gray-900">
              Built for{" "}
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Builders</span>
            </h2>
          </div>
          <p className="text-lg sm:text-xl text-gray-500 font-medium max-w-sm md:text-right pb-2">
            Whether you run an online store, a SaaS product, or an agency — Agenly gives you a smarter frontend.
          </p>
        </div>

        {/* Use Cases List */}
        <div className="flex flex-col border-t border-gray-200">
          {useCases.map((uc) => (
            <div key={uc.num} className="group flex flex-col lg:flex-row items-start lg:items-center py-12 sm:py-16 border-b border-gray-200 hover:bg-gray-50 transition-colors duration-500 px-4 sm:px-8 -mx-4 sm:-mx-8 rounded-3xl">
              
              {/* Tag & Num */}
              <div className="w-full lg:w-1/4 flex flex-col gap-2 mb-8 lg:mb-0">
                <span className="text-xs font-bold tracking-[0.2em] text-gray-400 group-hover:text-purple-600 transition-colors uppercase">
                  {uc.tag}
                </span>
                <span className="text-lg sm:text-xl font-medium text-gray-300 group-hover:text-purple-400 transition-colors font-beras">
                  /{uc.num}
                </span>
              </div>
              
              {/* Title & Desc */}
              <div className="w-full lg:w-[40%] pr-0 lg:pr-12 mb-8 lg:mb-0">
                <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">
                  {uc.title}
                </h3>
                <p className="text-base sm:text-lg text-gray-500 font-medium leading-relaxed">
                  {uc.desc}
                </p>
              </div>

              {/* Bullets */}
              <div className="w-full lg:w-[35%]">
                <ul className="space-y-4">
                  {uc.bullets.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-4">
                      <span className="text-purple-500 font-bold mt-0.5 text-lg">+</span>
                      <span className="text-sm sm:text-base text-gray-600 font-medium leading-snug group-hover:text-gray-900 transition-colors">
                        {b}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
