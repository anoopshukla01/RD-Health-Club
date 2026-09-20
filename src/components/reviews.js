export const reviewsData = [
  {
    quote: "It was a very good gym, they have a dedicated trainer and all types of machines to do the work. The training guidance was very good.",
    author: "Prashant R.",
    tag: "Local Guide • Gorakhpur",
    stars: 5
  },
  {
    quote: "Great place for workout, special personal training available. Very motivating atmosphere.",
    author: "Nitesh S.",
    tag: "Verified Member • Gorakhpur",
    stars: 5
  },
  {
    quote: "Nice place, fully air-conditioned, and the trainer is genuinely committed to your health and transformation.",
    author: "Tripathi J.",
    tag: "Verified Member",
    stars: 5
  },
  {
    quote: "One of the best gyms in Gorakhpur with one of the most talented and dedicated fitness trainers.",
    author: "Mr. English",
    tag: "Verified Member • Gorakhpur",
    stars: 5
  },
  {
    quote: "Nice place for workout with a very friendly and encouraging training environment.",
    author: "Akshay P.",
    tag: "Verified Member",
    stars: 5
  },
  {
    quote: "Amazing atmosphere and very friendly environment. High quality equipment and supportive vibe.",
    author: "Ariz P.",
    tag: "Local Guide • Gorakhpur",
    stars: 5
  },
  {
    quote: "Very good trainer at this gym. Thorough technique correction and professional support.",
    author: "Ashish G.",
    tag: "Local Guide",
    stars: 5
  }
];

export function renderReviews() {
  const container = document.querySelector('.reviews-grid');
  if (!container) return;

  container.innerHTML = reviewsData.map((rev) => `
    <div class="review-card">
      <div class="stars-row" style="margin-bottom: 12px;">
        ${'★'.repeat(rev.stars)}
      </div>
      <p class="review-quote">${rev.quote}</p>
      <div class="review-author-meta">
        <span class="review-author-name">${rev.author}</span>
        <span class="review-author-tag">${rev.tag}</span>
      </div>
    </div>
  `).join('');
}
