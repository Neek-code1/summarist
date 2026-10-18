import { useCallback, useEffect, useState } from "react";
import { AiFillAudio, AiFillBulb, AiFillFileText } from "react-icons/ai";
import { BsStarFill, BsStarHalf } from "react-icons/bs";
import { BiCrown } from "react-icons/bi";
import { RiLeafLine } from "react-icons/ri";
import AuthModal from "./AuthModal";

const firstHeadings = [
  "Enhance your knowledge",
  "Achieve greater success",
  "Improve your health",
  "Develop better parenting skills",
  "Increase happiness",
  "Be the best version of yourself!",
];

const secondHeadings = [
  "Expand your learning",
  "Accomplish your goals",
  "Strengthen your vitality",
  "Become a better caregiver",
  "Improve your mood",
  "Maximize your abilities",
];

const reviews = [
  {
    name: "Hanna M.",
    text: (
      <>
        This app has been a <b>game-changer</b> for me! It's saved me so much
        time and effort in reading and comprehending books. Highly recommend it
        to all book lovers.
      </>
    ),
  },
  {
    name: "David B.",
    text: (
      <>
        I love this app! It provides <b>concise and accurate summaries</b> of
        books in a way that is easy to understand. It's also very user-friendly
        and intuitive.
      </>
    ),
  },
  {
    name: "Nathan S.",
    text: (
      <>
        This app is a great way to get the main takeaways from a book without
        having to read the entire thing.{" "}
        <b>The summaries are well-written and informative.</b> Definitely worth
        downloading.
      </>
    ),
  },
  {
    name: "Ryan R.",
    text: (
      <>
        If you're a busy person who{" "}
        <b>loves reading but doesn't have the time</b> to read every book in
        full, this app is for you! The summaries are thorough and provide a
        great overview of the book's content.
      </>
    ),
  },
];

const footerGroups = [
  {
    title: "Actions",
    links: ["Summarist Magazine", "Cancel Subscription", "Help", "Contact us"],
  },
  {
    title: "Useful Links",
    links: [
      "Pricing",
      "Summarist Business",
      "Gift Cards",
      "Authors & Publishers",
    ],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Partners", "Code of Conduct"],
  },
  {
    title: "Other",
    links: ["Sitemap", "Legal Notice", "Terms of Service", "Privacy Policies"],
  },
];

function Stars({ half = false }) {
  return (
    <>
      {Array.from({ length: half ? 4 : 5 }, (_, index) => (
        <BsStarFill key={index} />
      ))}
      {half && <BsStarHalf />}
    </>
  );
}

export default function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [activeHeading, setActiveHeading] = useState(0);

  const closeAuth = useCallback(() => {
    setShowAuth(false);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHeading((current) => (current + 1) % 6);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  function handleLogin() {
    setShowAuth(true);
  }

  return (
    <>
      <nav className="nav">
        <div className="nav__wrapper">
          <figure className="nav__img--mask">
            <img
              className="nav__img"
              src={`${import.meta.env.BASE_URL}pricing-top.png`}
              alt="Summarist"
            />
          </figure>

          <ul className="nav__list--wrapper">
            <li className="nav__list nav__list--login">
              <button
                onClick={handleLogin}
                style={{ font: "inherit", color: "inherit" }}
              >
                Login
              </button>
            </li>
            <li className="nav__list nav__list--mobile">About</li>
            <li className="nav__list nav__list--mobile">Contact</li>
            <li className="nav__list nav__list--mobile">Help</li>
          </ul>
        </div>
      </nav>

      <section id="landing">
        <div className="container">
          <div className="row">
            <div className="landing__wrapper">
              <div className="landing__content">
                <div className="landing__content__title">
                  Gain more knowledge
                  <br className="remove--tablet" /> in less time
                </div>

                <div className="landing__content__subtitle">
                  Great summaries for busy people,
                  <br className="remove--tablet" />
                  individuals who barely have time to read,
                  <br className="remove--tablet" />
                  and even people who don’t like to read.
                </div>

                <button className="btn home__cta--btn" onClick={handleLogin}>
                  Login
                </button>
              </div>

              <figure className="landing__image--mask">
                <img
                  src={`${import.meta.env.BASE_URL}login.png`}
                  alt="Read and listen to book summaries"
                />
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section id="features">
        <div className="container">
          <div className="row">
            <div className="section__title">
              Understand books in few minutes
            </div>

            <div className="features__wrapper">
              <div className="features">
                <div className="features__icon">
                  <AiFillFileText />
                </div>
                <div className="features__title">Read or listen</div>
                <div className="features__sub--title">
                  Save time by getting the core ideas from the best books.
                </div>
              </div>

              <div className="features">
                <div className="features__icon">
                  <AiFillBulb />
                </div>
                <div className="features__title">Find your next read</div>
                <div className="features__sub--title">
                  Explore book lists and personalized recommendations.
                </div>
              </div>

              <div className="features">
                <div className="features__icon">
                  <AiFillAudio />
                </div>
                <div className="features__title">Briefcasts</div>
                <div className="features__sub--title">
                  Gain valuable insights from briefcasts
                </div>
              </div>
            </div>

            <div className="statistics__wrapper">
              <div className="statistics__content--header">
                {firstHeadings.map((heading, index) => (
                  <div
                    key={heading}
                    className={`statistics__heading ${
                      activeHeading === index
                        ? "statistics__heading--active"
                        : ""
                    }`}
                  >
                    {heading}
                  </div>
                ))}
              </div>

              <div className="statistics__content--details">
                <div className="statistics__data">
                  <div className="statistics__data--number">93%</div>
                  <div className="statistics__data--title">
                    of Summarist members <b>significantly increase</b> reading
                    frequency.
                  </div>
                </div>

                <div className="statistics__data">
                  <div className="statistics__data--number">96%</div>
                  <div className="statistics__data--title">
                    of Summarist members <b>establish better</b> habits.
                  </div>
                </div>

                <div className="statistics__data">
                  <div className="statistics__data--number">90%</div>
                  <div className="statistics__data--title">
                    have made <b>significant positive</b> change to their lives.
                  </div>
                </div>
              </div>
            </div>

            <div className="statistics__wrapper">
              <div className="statistics__content--details statistics__content--details-second">
                <div className="statistics__data">
                  <div className="statistics__data--number">91%</div>
                  <div className="statistics__data--title">
                    of Summarist members <b>report feeling more productive</b>{" "}
                    after incorporating the service into their daily routine.
                  </div>
                </div>

                <div className="statistics__data">
                  <div className="statistics__data--number">94%</div>
                  <div className="statistics__data--title">
                    of Summarist members have <b>noticed an improvement</b> in
                    their overall comprehension and retention of information.
                  </div>
                </div>

                <div className="statistics__data">
                  <div className="statistics__data--number">88%</div>
                  <div className="statistics__data--title">
                    of Summarist members <b>feel more informed</b> about current
                    events and industry trends since using the platform.
                  </div>
                </div>
              </div>

              <div className="statistics__content--header statistics__content--header-second">
                {secondHeadings.map((heading, index) => (
                  <div
                    key={heading}
                    className={`statistics__heading ${
                      activeHeading === index
                        ? "statistics__heading--active"
                        : ""
                    }`}
                  >
                    {heading}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="reviews">
        <div className="row">
          <div className="container">
            <div className="section__title">What our members say</div>

            <div className="reviews__wrapper">
              {reviews.map((review) => (
                <div className="review" key={review.name}>
                  <div className="review__header">
                    <div className="review__name">{review.name}</div>
                    <div className="review__stars" aria-label="5 stars">
                      <Stars />
                    </div>
                  </div>
                  <div className="review__body">{review.text}</div>
                </div>
              ))}
            </div>

            <div className="reviews__btn--wrapper">
              <button className="btn home__cta--btn" onClick={handleLogin}>
                Login
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="numbers">
        <div className="container">
          <div className="row">
            <div className="section__title">
              Start growing with Summarist now
            </div>

            <div className="numbers__wrapper">
              <div className="numbers">
                <div className="numbers__icon">
                  <BiCrown />
                </div>
                <div className="numbers__title">3 Million</div>
                <div className="numbers__sub--title">
                  Downloads on all platforms
                </div>
              </div>

              <div className="numbers">
                <div className="numbers__icon numbers__star--icon">
                  <Stars half />
                </div>
                <div className="numbers__title">4.5 Stars</div>
                <div className="numbers__sub--title">
                  Average ratings on iOS and Google Play
                </div>
              </div>

              <div className="numbers">
                <div className="numbers__icon">
                  <RiLeafLine />
                </div>
                <div className="numbers__title">97%</div>
                <div className="numbers__sub--title">
                  Of Summarist members create a better reading habit
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="footer">
        <div className="container">
          <div className="row">
            <div className="footer__top--wrapper">
              {footerGroups.map((group) => (
                <div className="footer__block" key={group.title}>
                  <div className="footer__link--title">{group.title}</div>

                  <div>
                    {group.links.map((label) => (
                      <div className="footer__link--wrapper" key={label}>
                        <span className="footer__link">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="footer__copyright--wrapper">
              <div className="footer__copyright">
                Copyright © 2023 Summarist.
              </div>
            </div>
          </div>
        </div>
      </section>

      {showAuth && <AuthModal onClose={closeAuth} />}
    </>
  );
}
