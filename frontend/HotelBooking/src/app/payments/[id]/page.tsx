import PaymentDetails from "@/components/tables/PaymentDetails";

export default async function PaymentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <div className="fade-in">
            <PaymentDetails id={id} />
        </div>
    );
}
