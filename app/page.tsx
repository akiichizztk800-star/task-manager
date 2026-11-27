import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <>
      <SiteHeader current="home" />
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <p className="text-sm font-medium text-teal-700">Supabase試作</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
          条件に沿って来月のシフトを作る
        </h1>
        <p className="mt-3 max-w-2xl text-stone-600">
          従業員、希望、確定シフトは Supabase に保存されます。従業員画面の「デモデータ初期化」で12名分を投入でき、スマホから送った希望は店長画面に反映されます。
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link
            href="/employees"
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm hover:border-teal-700"
          >
            <p className="text-sm font-medium text-teal-700">従業員</p>
            <p className="mt-2 text-xl font-semibold text-stone-900">役割を決める</p>
            <p className="mt-2 text-sm text-stone-600">
              責任者、エンジニア、一般スタッフを追加・編集します。兼任もできます。
            </p>
          </Link>
          <Link
            href="/staff"
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm hover:border-teal-700"
          >
            <p className="text-sm font-medium text-teal-700">スタッフ</p>
            <p className="mt-2 text-xl font-semibold text-stone-900">希望を出す</p>
            <p className="mt-2 text-sm text-stone-600">
              日ごとに ◎ 出勤、× 休み、△ どちらでも可、有給を送ります。有給は規定休日に加算されます。
            </p>
          </Link>
          <Link
            href="/manager"
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm hover:border-teal-700"
          >
            <p className="text-sm font-medium text-teal-700">店長</p>
            <p className="mt-2 text-xl font-semibold text-stone-900">自動で作る</p>
            <p className="mt-2 text-sm text-stone-600">
              月ごとの規定休日数に合わせて自動調整します。有給の日は表に「有」と出ます。
            </p>
          </Link>
        </div>
      </main>
    </>
  );
}
