import { animate as animateImpl, animateMini as animateMiniImpl } from "motion";

export const animate = import.meta.env.FIREFOX ? animateImpl : animateMiniImpl;
