<?php

namespace App\Services\Meta;

use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientStatus;
use App\Models\Inmopro\ClientTag;
use App\Models\Inmopro\ClientType;
use App\Models\Meta\MetaConnection;
use App\Models\Meta\MetaContactIdentity;
use App\Services\Crm\AdvisorCrmCatalogService;
use App\Services\Inmopro\ClientDuplicateRegistrationChecker;
use Illuminate\Support\Facades\DB;

class ContactMatcherService
{
    public function __construct(
        private ClientDuplicateRegistrationChecker $duplicateChecker,
    ) {}

    /**
     * @return array{client: ?Client, conflict: bool}
     */
    public function matchOrCreate(
        MetaConnection $connection,
        MetaContactIdentity $identity,
        ?string $profileName = null,
    ): array {
        $advisorId = $connection->advisor_id;

        $existingByIdentity = null;

        if (filled($identity->phone_normalized)) {
            $ownClient = Client::query()
                ->where('advisor_id', $advisorId)
                ->where('phone_normalized', $identity->phone_normalized)
                ->first();

            if ($ownClient) {
                return ['client' => $ownClient, 'conflict' => false];
            }

            $crossAdvisor = $this->duplicateChecker->findPhoneConflict($identity->phone);

            if ($crossAdvisor && (int) $crossAdvisor->advisor_id !== (int) $advisorId) {
                return ['client' => null, 'conflict' => true];
            }
        }

        $linkedClient = Client::query()
            ->where('advisor_id', $advisorId)
            ->whereHas('metaConversations', function ($query) use ($identity): void {
                $query->where('contact_identity_id', $identity->id);
            })
            ->first();

        if ($linkedClient) {
            return ['client' => $linkedClient, 'conflict' => false];
        }

        return [
            'client' => $this->createProspectClient($connection, $identity, $profileName),
            'conflict' => false,
        ];
    }

    private function createProspectClient(
        MetaConnection $connection,
        MetaContactIdentity $identity,
        ?string $profileName,
    ): Client {
        return DB::transaction(function () use ($connection, $identity, $profileName): Client {
            if ($connection->advisor) {
                app(AdvisorCrmCatalogService::class)->ensureDefaults($connection->advisor);
            }
            $prospectTypeId = ClientType::query()->where('code', 'PROSPECTO')->value('id');
            $nuevoStatusId = ClientStatus::query()
                ->where('advisor_id', $connection->advisor_id)
                ->where('code', 'NUEVO')
                ->value('id');

            $client = Client::query()->create([
                'name' => $profileName ?: $identity->profile_name ?: 'Contacto Meta',
                'phone' => $identity->phone ?: '000000000',
                'advisor_id' => $connection->advisor_id,
                'client_type_id' => $prospectTypeId,
                'client_status_id' => $nuevoStatusId,
            ]);

            $tagCode = $identity->channel === 'whatsapp' ? 'WHATSAPP' : null;

            if ($tagCode) {
                $tagId = ClientTag::query()
                    ->where('advisor_id', $connection->advisor_id)
                    ->where('code', $tagCode)
                    ->value('id');
                if ($tagId) {
                    $client->tags()->syncWithoutDetaching([$tagId]);
                }
            }

            return $client->fresh(['tags', 'status', 'type']);
        });
    }
}
