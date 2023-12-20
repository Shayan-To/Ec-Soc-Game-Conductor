import Link from "next/link";

export default async function Home() {
    return (
        <div>
            {/* <Button LinkComponent={Link} href="/create-firm">
                تولیدی جدید
            </Button> */}
            <Link href="/create-firm">تولیدی جدید</Link>
        </div>
    );
}
