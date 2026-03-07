"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

export const SafeForm = forwardRef<
  HTMLFormElement,
  ComponentPropsWithoutRef<"form">
>(function SafeForm(props, ref) {
  return <form {...props} ref={ref} suppressHydrationWarning />;
});

export const SafeInput = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<"input">
>(function SafeInput(props, ref) {
  return <input {...props} ref={ref} suppressHydrationWarning />;
});

export const SafeTextarea = forwardRef<
  HTMLTextAreaElement,
  ComponentPropsWithoutRef<"textarea">
>(function SafeTextarea(props, ref) {
  return <textarea {...props} ref={ref} suppressHydrationWarning />;
});

export const SafeSelect = forwardRef<
  HTMLSelectElement,
  ComponentPropsWithoutRef<"select">
>(function SafeSelect(props, ref) {
  return <select {...props} ref={ref} suppressHydrationWarning />;
});
