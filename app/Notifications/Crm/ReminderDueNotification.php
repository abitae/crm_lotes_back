<?php

namespace App\Notifications\Crm;

use App\Models\Inmopro\AdvisorReminder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ReminderDueNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly AdvisorReminder $reminder) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url(route('crm.reminders.index', [], false));
        $clientName = $this->reminder->client?->name;

        $message = (new MailMessage)
            ->subject('Recordatorio pendiente: '.$this->reminder->title)
            ->greeting('Hola'.($notifiable->name ? ' '.$notifiable->name : '').',')
            ->line('Tienes un recordatorio vencido en el CRM:');

        if ($clientName) {
            $message->line('Cliente: '.$clientName);
        }

        return $message
            ->line('Título: '.$this->reminder->title)
            ->line('Vencimiento: '.$this->reminder->remind_at->format('d/m/Y H:i'))
            ->action('Ver mis recordatorios', $url);
    }
}
