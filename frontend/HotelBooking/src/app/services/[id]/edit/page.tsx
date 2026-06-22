import EditService from "@/components/forms/EditService";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <div>
            <EditService id={id} />
        </div>
    );
}
