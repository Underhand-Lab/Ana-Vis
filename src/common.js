import * as _ from "./markdown.js"

const menuSelector = document.querySelector("#feature");

menuSelector?.addEventListener('change', (e) => {
    location.href = e.target.value;
});

/*
window.addEventListener('load', function () {

    let lastScrollY = window.scrollY;
    const navbar = document.querySelector('nav');

    window.addEventListener("scroll", () => {
        const currentScrollY = window.scrollY;
        const THRESHOLD = 10;

        if (Math.abs(currentScrollY - lastScrollY) < THRESHOLD) return;
        if (currentScrollY <= 0) {
            navbar.classList.remove("hidden");
        }
        else if (currentScrollY < lastScrollY) {
            // 위로 스크롤 → 보이기
            navbar.classList.remove("hidden");
        } else {
            // 아래로 스크롤 → 숨기기
            navbar.classList.add("hidden");
        }

        lastScrollY = currentScrollY;
    });
});*/